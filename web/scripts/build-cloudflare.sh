#!/usr/bin/env bash
# Static build for Cloudflare Workers (static assets), served under a sub-path.
# The files are laid out at dist/<base path>/ so asset URLs match request paths:
# the Worker's route on gabriel-laet.com/p/rios-invisiveis* serves them as-is.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${NEXT_PUBLIC_BASE_PATH-/p/rios-invisiveis}"
BASE="${BASE%/}"

STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH="$BASE" pnpm exec next build

rm -rf dist
mkdir -p "dist$BASE"
# With output: "export" and a custom distDir, the static site lands in that dir.
cp -R .next-export/. "dist$BASE/"
rm -rf "dist$BASE/cache" "dist$BASE/types"

# Cloudflare static-asset headers (next.config headers() don't apply to a static export).
cat > dist/_headers <<HEADERS
$BASE/data/*
  Cache-Control: public, max-age=3600
$BASE/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
HEADERS

echo "Built dist$BASE ($(du -sh dist | cut -f1))"
