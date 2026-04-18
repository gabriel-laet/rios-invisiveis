# Building São Paulo 3D terrain tiles from GeoSampa LiDAR

Skip this for phase-1 — the app uses public **AWS Terrarium** tiles for 3D
terrain, which are fine for the whole world at ~30 m resolution.

When you want true sub-metre topography (to make the lost meanders of
Pinheiros pop in 3D), run this pipeline on a beefy machine (local laptop or a
Hetzner AX-class dedicated server).

## 1. Download LiDAR tiles from GeoSampa

Open <https://geosampa.prefeitura.sp.gov.br/>, pick
**Search → Download Imagens/MDC → MDT 2020** and select the quadrants you need.
You'll get `.tif` files already processed to bare-earth terrain at 1 m.

Alternatively `.laz` point clouds are available if you want to re-process.

## 2. Merge and reproject to web Mercator

```bash
gdalbuildvrt merged.vrt *.tif
gdalwarp -t_srs EPSG:3857 -r bilinear -tr 1 1 merged.vrt dem_3857.tif
```

## 3. Convert to Terrain-RGB tiles

Install `rio-rgbify` (from Mapbox):

```bash
pip install rio-rgbify
rio rgbify -b -10000 -i 0.1 --min-z 10 --max-z 15 \
  --format webp dem_3857.tif dem_tiles.mbtiles
```

## 4. Serve as XYZ tiles

Either:

- Extract to a directory tree of `{z}/{x}/{y}.webp` with `mb-util`,
  upload to R2/Spaces/Hetzner Object Storage.
- Or convert `.mbtiles` → `.pmtiles` with `pmtiles convert` and range-serve.

## 5. Wire into the app

Set `NEXT_PUBLIC_DEM_TILES` in `.env.local`:

```
NEXT_PUBLIC_DEM_TILES=https://cdn.example.com/sp-dem/{z}/{x}/{y}.webp
```

Then swap the `terrarium` source in `lib/mapStyle.ts` to use this URL with
`encoding: "mapbox"`.
