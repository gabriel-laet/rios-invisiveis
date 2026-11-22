# Rios Invisíveis · São Paulo

Interactive map of São Paulo's buried rivers — overlaid on the current street
grid, with 3D relief, historical swipe (SARA Brasil 1930), and scrollytelling
through four of the city's lost waterways (Anhangabaú, Tamanduateí, Pinheiros,
Tietê).

**Data is real.** The sample GeoJSON in `data/` was fetched live from
[GeoSampa WFS](http://wfs.geosampa.prefeitura.sp.gov.br/) over a bbox that
covers the historic centre plus the Pinheiros/Tietê corridors (~15 × 15 km).
Every river line has a `nm_tipo_curso_hidrografia` attribute that classifies
it as natural / open channel / **buried gallery** — that's what drives the
colour coding.

## Run locally

```
cd web
pnpm install
cp .env.example .env.local   # optional: add NEXT_PUBLIC_CARTO_KEY
pnpm dev
# -> http://localhost:3000
```

The "Claro"/"Escuro" basemaps use CARTO, which now requires a free key
(request one by email at https://carto.com/basemaps/apikey — 5M req/mo
non-commercial, 1M commercial, no card). Without `NEXT_PUBLIC_CARTO_KEY`
they fall back to plain OSM tiles.

The app ships with ~12 MB of seed GeoJSON already in `web/public/data/`.
That's enough to see the central-SP rivers immediately. No keys, no infra.

## Refresh data from GeoSampa

```
bash etl/fetch-geosampa.sh
# or with a custom bbox (EPSG:4326):
bash etl/fetch-geosampa.sh "-46.78,-23.62,-46.58,-23.48,EPSG:4326"
```

Files land in `data/` and are copied to `web/public/data/` so the dev server
picks them up on next reload.

## What you can do in the app

- **2D rivers overlay** styled by burial status:
  - blue solid = natural
  - pale blue = open channel
  - dashed pink = buried underground (the invisible ones)
- **3D terrain toggle** — uses public AWS Terrarium tiles (~30 m), no key
- **Hillshade** — same source, for relief readability
- **Flood 100-yr** — GeoSampa `mancha_inundacao_100` polygons
- **Basin outlines** — `bacia_hidrografica`
- **Historical swipe** — wire up `NEXT_PUBLIC_SARA_TILES` with a URL template
  for SARA 1930 raster tiles (see `etl/build-dem-tiles.md` for the notes on
  how to georeference and tile the 1930 mosaic from GeoSampa)
- **Scrollytelling** — the left panel flies the camera through 4 chapters

## Going to production (phase 2)

The current setup loads GeoJSON directly for simplicity. For production:

1. Run `etl/build-pmtiles.sh` to produce `rivers.pmtiles`, `water.pmtiles`,
   etc. (requires `tippecanoe`).
2. Upload to an S3-compatible bucket (Cloudflare R2, DO Spaces, Hetzner
   Object Storage).
3. Point the app at them via env:

   ```
   NEXT_PUBLIC_CARTO_KEY=your-carto-key
   NEXT_PUBLIC_RIVERS_PMTILES=https://cdn.example.com/rivers.pmtiles
   NEXT_PUBLIC_WATER_PMTILES=https://cdn.example.com/water.pmtiles
   NEXT_PUBLIC_FLOOD100_PMTILES=https://cdn.example.com/flood100.pmtiles
   NEXT_PUBLIC_BASINS_PMTILES=https://cdn.example.com/basins.pmtiles
   NEXT_PUBLIC_SARA_TILES=https://cdn.example.com/sara1930/{z}/{x}/{y}.png
   NEXT_PUBLIC_DEM_TILES=https://cdn.example.com/sp-dem/{z}/{x}/{y}.webp
   ```

4. Deploy the Next.js app to Vercel / Cloudflare Pages / Netlify.
5. (Optional) Run the ETL in Vercel Sandbox, a Hetzner VPS, or GitHub Actions
   on a cron.

See `../ARCHITECTURE.md` and the prior conversation for hosting cost
comparisons.

## Data sources

- **GeoSampa** (Prefeitura de São Paulo) — WFS/WMS at
  `wfs.geosampa.prefeitura.sp.gov.br`. Main layer used: `geoportal:drenagem`
  with the `nm_tipo_curso_hidrografia` attribute.
- **AWS Terrain Tiles** (Mazpen/Terrarium) — public DEM.
- **OpenStreetMap** and **CARTO basemaps** — current street grid.
- **SARA Brasil 1930** mapping — georeferenced 1:5000 topographic survey,
  available on GeoSampa as a download. Requires separate tiling (see
  `etl/build-dem-tiles.md` for the LiDAR variant of the same workflow).

## Project layout

```
rios/
├── README.md                 ← you are here
├── data/                     ← raw and slimmed GeoJSON from GeoSampa
├── etl/
│   ├── fetch-geosampa.sh     ← WFS download + slim
│   ├── slim-geojson.py       ← coord-rounding + prop filtering
│   ├── build-pmtiles.sh      ← tippecanoe → PMTiles (phase 2)
│   └── build-dem-tiles.md    ← notes on LiDAR → Terrain-RGB pipeline
└── web/                      ← Next.js 15 + MapLibre + deck.gl + PMTiles
    ├── app/
    ├── components/
    ├── lib/
    │   ├── mapStyle.ts       ← MapLibre style spec (sources, layers, colors)
    │   └── rivers.ts         ← types, color map, chapter definitions
    └── public/data/          ← runtime copies of the slimmed GeoJSON
```
