#!/usr/bin/env bash
# Fetch hydrography layers from GeoSampa WFS.
# Usage: bash etl/fetch-geosampa.sh [BBOX]
# BBOX: "minLon,minLat,maxLon,maxLat,EPSG:4326"
#
# Defaults to a box covering central SP + Pinheiros/Tietê corridors.

set -euo pipefail

BBOX="${1:--46.78,-23.62,-46.58,-23.48,EPSG:4326}"
WFS="http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/ows"
OUT="$(cd "$(dirname "$0")/.." && pwd)/data"
mkdir -p "$OUT"

fetch () {
  local layer="$1"
  local out="$OUT/$layer.geojson"
  echo "-> $layer"
  curl -s --max-time 180 "${WFS}?service=wfs&version=2.0.0&request=GetFeature&typeNames=geoportal:${layer}&outputFormat=application/json&srsName=EPSG:4326&bbox=${BBOX}" -o "$out"
  local n
  n=$(python3 -c "import json,sys; d=json.load(open('$out')); print(len(d.get('features',[])))")
  echo "   $n features  ($(du -h "$out" | cut -f1))"
}

fetch drenagem
fetch massa_d_agua
fetch bacia_hidrografica
fetch mancha_inundacao_100
fetch mancha_inundacao_25

# Slim down to a reasonable size
KEEP_RIVERS="nm_acidente,nm_tipo_curso_hidrografia,nm_tipo_trecho,tx_tipo_acidente,qt_comprimento_hidrografia,nm_via_proximo,cd_identificador"
python3 "$(dirname "$0")/slim-geojson.py" "$OUT/drenagem.geojson"           "$OUT/drenagem.geojson"           "$KEEP_RIVERS"
python3 "$(dirname "$0")/slim-geojson.py" "$OUT/massa_d_agua.geojson"       "$OUT/massa_d_agua.geojson"       "nm_acidente,tx_tipo_acidente"
python3 "$(dirname "$0")/slim-geojson.py" "$OUT/bacia_hidrografica.geojson" "$OUT/bacia_hidrografica.geojson" "nm_bacia,nm_sub_bacia"
python3 "$(dirname "$0")/slim-geojson.py" "$OUT/mancha_inundacao_100.geojson" "$OUT/mancha_inundacao_100.geojson" "tipo"
python3 "$(dirname "$0")/slim-geojson.py" "$OUT/mancha_inundacao_25.geojson"  "$OUT/mancha_inundacao_25.geojson"  "tipo"

# Copy to /public for the dev server
WEB_PUBLIC="$(cd "$(dirname "$0")/.." && pwd)/web/public/data"
mkdir -p "$WEB_PUBLIC"
cp "$OUT"/*.geojson "$WEB_PUBLIC/"
echo "Copied to $WEB_PUBLIC"
