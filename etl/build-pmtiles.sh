#!/usr/bin/env bash
# Convert the slimmed GeoJSON layers to PMTiles for production hosting.
#
# Requires: tippecanoe (https://github.com/felt/tippecanoe)
# Outputs: data/pmtiles/*.pmtiles
#
# After this runs, upload the pmtiles to R2/Spaces/Hetzner Object Storage
# and point the app at them via NEXT_PUBLIC_RIVERS_PMTILES, etc.

set -euo pipefail

if ! command -v tippecanoe >/dev/null; then
  echo "tippecanoe not found. Install:"
  echo "  brew install tippecanoe   # macOS"
  echo "  apt install tippecanoe    # Debian/Ubuntu (may need backports)"
  echo "  or build from source: https://github.com/felt/tippecanoe"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="$ROOT/data"
OUT="$ROOT/data/pmtiles"
mkdir -p "$OUT"

# Rivers (drenagem): keep small, zoom 8..16, label feature importance by length
tippecanoe \
  -o "$OUT/rivers.pmtiles" -f \
  --layer=rivers \
  --minimum-zoom=8 --maximum-zoom=16 \
  --drop-densest-as-needed \
  --simplification=3 \
  --coalesce-smallest-as-needed \
  "$IN/drenagem.geojson"

# Water bodies
tippecanoe \
  -o "$OUT/water.pmtiles" -f \
  --layer=water \
  --minimum-zoom=6 --maximum-zoom=16 \
  --drop-densest-as-needed \
  "$IN/massa_d_agua.geojson"

# Flood 100yr
tippecanoe \
  -o "$OUT/flood100.pmtiles" -f \
  --layer=flood100 \
  --minimum-zoom=8 --maximum-zoom=14 \
  --drop-densest-as-needed \
  --simplification=4 \
  "$IN/mancha_inundacao_100.geojson"

# Basins
tippecanoe \
  -o "$OUT/basins.pmtiles" -f \
  --layer=basins \
  --minimum-zoom=7 --maximum-zoom=14 \
  --coalesce-smallest-as-needed \
  "$IN/bacia_hidrografica.geojson"

echo
echo "Wrote PMTiles to $OUT"
ls -lh "$OUT"
