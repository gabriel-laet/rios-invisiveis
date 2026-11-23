#!/usr/bin/env bash
# Fetch hydrography layers from GeoSampa WFS.
# Usage: bash etl/fetch-geosampa.sh [BBOX]
# BBOX: "minLon,minLat,maxLon,maxLat,EPSG:4326"
#
# Defaults to a box covering central SP + Pinheiros/Tietê corridors.
#
# GeoSampa's GeoServer caps every GetFeature response at 30,000 features, so
# each layer is paged with startIndex/count (sorted by its primary key so pages
# don't overlap) and the pages are merged before slimming.

set -euo pipefail

BBOX="${1:--46.78,-23.62,-46.58,-23.48,EPSG:4326}"
# Whole municipality (IBGE 3550308) — used for the city-wide river network.
CITY_BBOX="-46.83,-24.01,-46.36,-23.35,EPSG:4326"
IBGE_SP="https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3550308?formato=application/vnd.geo%2Bjson&qualidade=maxima"
WFS="http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/ows"
PAGE=30000
ETL="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$ETL/.." && pwd)/data"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# fetch <layer> <sort-key> [bbox] [out-name]
fetch () {
  local layer="$1" sort="$2" bbox="${3:-$BBOX}" name="${4:-$1}"
  local out="$OUT/$name.geojson"
  local base="${WFS}?service=wfs&version=2.0.0&request=GetFeature&typeNames=geoportal:${layer}&bbox=${bbox}"

  local total
  total=$(curl -s --max-time 180 "${base}&resultType=hits" | grep -o 'numberMatched="[0-9]*"' | grep -o '[0-9]*')
  echo "-> $name  ($total features matched)"

  local start=0 i=0 pages=()
  while [ "$start" -lt "$total" ]; do
    local page="$TMP/${name}.$i.json"
    if ! curl -s --fail --retry 3 --max-time 600 \
      "${base}&outputFormat=application/json&srsName=EPSG:4326&sortBy=${sort}&count=${PAGE}&startIndex=${start}" \
      -o "$page"; then
      echo "   ERROR: page $i of $layer failed (sortBy=${sort})" >&2
      exit 1
    fi
    pages+=("$page")
    echo "   page $i: startIndex=$start"
    start=$((start + PAGE))
    i=$((i + 1))
  done

  python3 "$ETL/merge-geojson.py" "$out" "$total" "${pages[@]}"
  rm -f "${pages[@]}"
}

fetch drenagem             cd_identificador
fetch massa_d_agua         cd_identificador_hidrografia_poligono
fetch bacia_hidrografica   cd_identificador_bacia_hidrografica
fetch mancha_inundacao_100 cd_identificador
fetch mancha_inundacao_25  cd_identificador

# Dissolving / clipping needs shapely: use it if installed, otherwise via uv.
if python3 -c "import shapely" 2>/dev/null; then
  PY_GEO=(python3)
elif command -v uv >/dev/null; then
  PY_GEO=(uv run -q --no-project --with shapely python)
else
  echo "The flood dissolve and city clip need shapely (pip install shapely) or uv." >&2
  exit 1
fi

# Slim down to a reasonable size
KEEP_RIVERS="nm_acidente,nm_tipo_curso_hidrografia,nm_tipo_trecho,tx_tipo_acidente,qt_comprimento_hidrografia,nm_via_proximo,cd_identificador"
python3 "$ETL/slim-geojson.py" "$OUT/drenagem.geojson"           "$OUT/drenagem.geojson"           "$KEEP_RIVERS"
python3 "$ETL/slim-geojson.py" "$OUT/massa_d_agua.geojson"       "$OUT/massa_d_agua.geojson"       "nm_acidente"
python3 "$ETL/slim-geojson.py" "$OUT/bacia_hidrografica.geojson" "$OUT/bacia_hidrografica.geojson" "nm_bacia_hidrografica,nm_bacia_hidrografica_principal"
# The flood layers are hundreds of thousands of small cells: dissolve them
# into merged polygons (per basin) so the browser gets a few MB, not ~140.
"${PY_GEO[@]}" "$ETL/slim-geojson.py" "$OUT/mancha_inundacao_100.geojson" "$OUT/mancha_inundacao_100.geojson" "nm_bacia_hidrografica" --dissolve nm_bacia_hidrografica
"${PY_GEO[@]}" "$ETL/slim-geojson.py" "$OUT/mancha_inundacao_25.geojson"  "$OUT/mancha_inundacao_25.geojson"  "nm_bacia_hidrografica" --dissolve nm_bacia_hidrografica

# City-wide river network, clipped to the municipality boundary. This feeds
# the "only São Paulo, only rivers" view; the bbox layers above stay as-is.
echo "-> limite_sp (IBGE)"
curl -s --fail --retry 3 --max-time 120 "$IBGE_SP" -o "$OUT/limite_sp.geojson"
fetch drenagem cd_identificador "$CITY_BBOX" drenagem_sp_raw
"${PY_GEO[@]}" "$ETL/build-city-rivers.py" "$OUT/drenagem_sp_raw.geojson" "$OUT/limite_sp.geojson" "$OUT/rios_sp.geojson"
rm -f "$OUT/drenagem_sp_raw.geojson"

# Copy to /public for the dev server
WEB_PUBLIC="$(cd "$ETL/.." && pwd)/web/public/data"
mkdir -p "$WEB_PUBLIC"
cp "$OUT"/*.geojson "$WEB_PUBLIC/"
echo "Copied to $WEB_PUBLIC"
