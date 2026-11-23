import type { RasterSourceSpecification, StyleSpecification } from "maplibre-gl";
import { BURIAL_COLOR } from "./rivers";

const OSM_TILES = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];

// CARTO raster basemaps now require a (free) key: https://carto.com/basemaps/apikey
// Free tier: 5M req/mo non-commercial, 1M commercial. Attribution "© OpenStreetMap contributors, © CARTO".
export const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY || "";

const cartoTiles = (style: "light_all" | "dark_all") =>
  CARTO_KEY
    ? [`https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${CARTO_KEY}`]
    : // Without a key CARTO serves "API KEY REQUIRED" watermark tiles — fall back to OSM.
      OSM_TILES;

const CARTO_LIGHT = cartoTiles("light_all");
const CARTO_DARK = cartoTiles("dark_all");

// AWS Open Data Terrain Tiles (Terrarium encoding), no API key needed
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Historical SARA 1930 tiles — placeholder. Override via NEXT_PUBLIC_SARA_TILES.
const SARA_TILES =
  process.env.NEXT_PUBLIC_SARA_TILES ||
  "";

const SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// "rivers" = no street basemap: only São Paulo's outline and its water.
export type BaseMapId = "rivers" | "light" | "dark" | "osm" | "satellite";

const PAPER = "#f4ede0";
const OUTSIDE = "#e4dccb";

export function baseMapTiles(id: BaseMapId): string[] {
  switch (id) {
    case "dark":
      return CARTO_DARK;
    case "osm":
      return OSM_TILES;
    case "satellite":
      return [SATELLITE];
    case "light":
    case "rivers": // basemap layer is hidden; keep a valid source anyway
    default:
      return CARTO_LIGHT;
  }
}

export function basemapSource(base: BaseMapId): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: baseMapTiles(base),
    tileSize: 256,
    attribution:
      base === "satellite"
        ? "Esri, Maxar, Earthstar Geographics"
        : base === "osm" || !CARTO_KEY
          ? "© OpenStreetMap contributors"
          : "© OpenStreetMap contributors · © CARTO",
    maxzoom: 19,
  };
}

export function buildStyle(base: BaseMapId = "light"): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: basemapSource(base),
      terrarium: {
        type: "raster-dem",
        tiles: [TERRARIUM],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
        attribution: "Terrain: AWS Terrain Tiles (Mapzen)",
      },
      hillshade: {
        type: "raster-dem",
        tiles: [TERRARIUM],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
      },
      // Whole-city network clipped to the municipality (etl/build-city-rivers.py).
      // Props: t (n natural · o open channel · b buried · l lake), nm, via.
      rivers: {
        type: "geojson",
        data: "/data/rios_sp.geojson",
        generateId: true,
      },
      // Everything outside the city; filled in at runtime by setCityMask().
      mask: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
      city: {
        type: "geojson",
        data: "/data/limite_sp.geojson",
      },
      water: {
        type: "geojson",
        data: "/data/massa_d_agua.geojson",
      },
      flood100: {
        type: "geojson",
        data: "/data/mancha_inundacao_100.geojson",
      },
      basins: {
        type: "geojson",
        data: "/data/bacia_hidrografica.geojson",
      },
      ...(SARA_TILES
        ? {
            sara1930: {
              type: "raster",
              tiles: [SARA_TILES],
              tileSize: 256,
              attribution: "SARA Brasil 1930 · GeoSampa",
            },
          }
        : {}),
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": PAPER } },
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        layout: { visibility: base === "rivers" ? "none" : "visible" },
      },

      {
        id: "hillshade",
        type: "hillshade",
        source: "hillshade",
        layout: { visibility: "none" },
        paint: {
          "hillshade-shadow-color": "#1a1a1a",
          "hillshade-highlight-color": "#ffffff",
          "hillshade-accent-color": "#374151",
          "hillshade-exaggeration": 0.45,
        },
      },

      {
        id: "flood-100",
        type: "fill",
        source: "flood100",
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 0.35],
          "fill-outline-color": "#1e3a8a",
        },
      },

      {
        id: "basins-outline",
        type: "line",
        source: "basins",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#6b4f2a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 15, 2.2],
          "line-opacity": 0.85,
          "line-dasharray": [3, 2],
        },
      },

      {
        id: "city-mask",
        type: "fill",
        source: "mask",
        paint: {
          "fill-color": base === "rivers" ? OUTSIDE : PAPER,
          "fill-opacity": base === "rivers" ? 1 : 0.72,
        },
      },
      {
        id: "city-outline",
        type: "line",
        source: "city",
        paint: {
          "line-color": "#3b3226",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2.5],
          "line-opacity": 0.7,
        },
      },

      {
        id: "water-fill",
        type: "fill",
        source: "water",
        paint: {
          "fill-color": BURIAL_COLOR.lake,
          "fill-opacity": 0.55,
          "fill-outline-color": "#1e5478",
        },
      },

      {
        id: "rivers-buried-halo",
        type: "line",
        source: "rivers",
        filter: ["==", ["get", "t"], "b"],
        paint: {
          "line-color": BURIAL_COLOR.buried,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 6, 17, 14],
          "line-opacity": 0.18,
          "line-blur": 6,
        },
      },

      {
        id: "rivers-buried",
        type: "line",
        source: "rivers",
        filter: ["==", ["get", "t"], "b"],
        paint: {
          "line-color": BURIAL_COLOR.buried,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 2, 17, 4],
          "line-opacity": 0.95,
          "line-dasharray": [2, 2],
        },
      },

      {
        id: "rivers-channelized",
        type: "line",
        source: "rivers",
        filter: ["==", ["get", "t"], "o"],
        paint: {
          "line-color": BURIAL_COLOR.open,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 2.5, 17, 5],
          "line-opacity": 0.9,
        },
      },

      {
        id: "rivers-natural",
        type: "line",
        source: "rivers",
        filter: ["in", ["get", "t"], ["literal", ["n", "l"]]],
        paint: {
          "line-color": BURIAL_COLOR.natural,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 3, 17, 6],
          "line-opacity": 0.95,
        },
      },

      {
        id: "rivers-labels",
        type: "symbol",
        source: "rivers",
        minzoom: 13,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "nm"], ""],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-letter-spacing": 0.06,
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": PAPER,
          "text-halo-width": 1.4,
        },
      },

      ...(SARA_TILES
        ? [
            {
              id: "sara1930",
              type: "raster" as const,
              source: "sara1930",
              layout: { visibility: "none" as const },
              paint: { "raster-opacity": 0.85 },
            },
          ]
        : []),
    ],
  };
}

/** World polygon with the city cut out, for the "only São Paulo" mask. */
export function cityMask(boundary: GeoJSON.FeatureCollection): GeoJSON.Feature<GeoJSON.Polygon> {
  const world: GeoJSON.Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  const holes: GeoJSON.Position[][] = [];
  for (const f of boundary.features) {
    const g = f.geometry;
    if (g.type === "Polygon") holes.push(g.coordinates[0]);
    else if (g.type === "MultiPolygon") g.coordinates.forEach((poly) => holes.push(poly[0]));
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } };
}

/** Restyle the mask and basemap for the chosen base without rebuilding the style. */
export function applyBaseLook(
  map: { setPaintProperty: (l: string, p: string, v: unknown) => void; setLayoutProperty: (l: string, p: string, v: unknown) => void },
  base: BaseMapId,
) {
  const riversOnly = base === "rivers";
  map.setLayoutProperty("basemap", "visibility", riversOnly ? "none" : "visible");
  map.setPaintProperty("city-mask", "fill-color", riversOnly ? OUTSIDE : PAPER);
  map.setPaintProperty("city-mask", "fill-opacity", riversOnly ? 1 : 0.72);
}
