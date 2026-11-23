# Rios Invisíveis · São Paulo

São Paulo has about 5,000 km of mapped rivers and streams; 1,363 km of them
run buried under the city. This is a scrollytelling map of that water — the
city switched off, only its rivers left, buried ones glowing amber like the
street lamps of the avenues built on top of them.

- **Story mode** — 15 beats from 1554 to today. A water-meter odometer
  (*hidrômetro*) and a river-gauge ruler (*régua*) make time explicit: rivers
  you meet turn from blue to "under works" to buried as the years roll past.
- **Explore mode** — pan/zoom the whole city, hover any stream for its name
  and the street that runs over it, toggle relief, flood extents, basins.
- **Rio perto de mim** — finds the buried river nearest to you (or to a point
  you pick). Runs entirely in the browser; your location is never sent anywhere.

Design and narrative: [`docs/STORY_DESIGN.md`](docs/STORY_DESIGN.md)
("Concreto e água, à noite"). Historical dates marked *verificar* there still
need a source before publishing — the UI shows them with a `c.` prefix.

**Data is real**: GeoSampa's `drenagem` network for the whole municipality,
clipped to the IBGE boundary. Every segment carries GeoSampa's status —
natural, open channel, **buried gallery**, lake — and that drives the map.

## Run locally

```
cd web
pnpm install
pnpm dev
# -> http://localhost:3000   (/#explorar opens straight in explore mode)
```

No keys needed. `web/.env.example` documents the one optional variable
(`NEXT_PUBLIC_SARA_TILES`, for a georeferenced SARA 1930 raster).

## Acceptance test

`docs/STORY_DESIGN.md` §9 lists checkable "personality" criteria (only water
on the first screen, the year visible on every beat, time moving forward,
wheel scrolls the story not the map, "Rio perto de mim" at Av. 23 de Maio
finds the córrego Itororó without leaking the location, mobile, reduced
motion, keyboard…). They're automated:

```
cd web
pnpm dev                       # in another terminal
pnpm acceptance [outDir]       # headless, uses your installed Chrome/Chromium
```

It prints PASS/FAIL per criterion and saves a screenshot of every beat to
`outDir` (default `acceptance-out/`). Set `CHROME_PATH` / `BASE_URL` to override.

## Refresh data

```
bash etl/fetch-geosampa.sh
```

Pages through GeoSampa's WFS (30,000 features per response), dissolves the
flood cells, fetches the IBGE municipality boundary, clips the city-wide river
network to it (`build-city-rivers.py`) and regenerates the numbers the story
quotes (`web/lib/generated/stats.json`). Needs `shapely`, or `uv` to fetch it.
Outputs land in `data/`; the files the app loads are copied to `web/public/data/`.

## Data sources

- **GeoSampa** (Prefeitura de São Paulo) — WFS at
  `wfs.geosampa.prefeitura.sp.gov.br`: `drenagem` (rivers, with
  `nm_tipo_curso_hidrografia`), `massa_d_agua`, `mancha_inundacao_100`,
  `bacia_hidrografica`.
- **IBGE** — municipality boundary (malhas API, code 3550308).
- **AWS Terrain Tiles** (Terrarium) — relief and 3D terrain.
- **OpenFreeMap** — faint street hints (one story beat, and the "Ruas" base).
- **Esri World Imagery** — the "Satélite" base.

## Project layout

```
riosp/
├── data/                       raw + slimmed GeoJSON from GeoSampa / IBGE
├── docs/STORY_DESIGN.md        design & narrative spec
├── etl/
│   ├── fetch-geosampa.sh       paged WFS download, slim, clip, stats
│   ├── merge-geojson.py        merges WFS pages
│   ├── slim-geojson.py         coord rounding, prop filter, --dissolve
│   ├── build-city-rivers.py    clip to the city, compact props, stats.json
│   ├── build-pmtiles.sh        tippecanoe → PMTiles (later)
│   └── build-dem-tiles.md      notes on LiDAR → Terrain-RGB
└── web/                        Next.js 15 + MapLibre GL 5
    ├── app/                    page, fonts, global styles
    ├── components/
    │   ├── StoryScroller.tsx   the 15 beats, scroll → step/progress/year
    │   ├── MapView.tsx         map, camera per beat, explore mode, hover
    │   ├── Hidrometro.tsx      odometer + régua
    │   ├── StoryCallouts.tsx   DOM labels per beat
    │   ├── PertoDeMim.tsx      "Rio perto de mim"
    │   └── ExploreBar / LayerToggles / Legend
    ├── lib/
    │   ├── story.ts            beats (copy, camera, layers, years)
    │   ├── timeline.ts         curated dates, certainty, name formatting
    │   ├── mapStyle.ts         layer stack + network/state filters
    │   ├── nearest.ts          nearest-river search, point-in-city
    │   └── generated/stats.json  numbers from the ETL
    ├── scripts/acceptance.mjs  §9 acceptance test
    └── public/data/            GeoJSON the app loads
```
