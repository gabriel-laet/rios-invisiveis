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

export type BaseMapId = "light" | "dark" | "osm" | "satellite";

export function baseMapTiles(id: BaseMapId): string[] {
  switch (id) {
    case "dark":
      return CARTO_DARK;
    case "osm":
      return OSM_TILES;
    case "satellite":
      return [SATELLITE];
    case "light":
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
      rivers: {
        type: "geojson",
        data: "/data/drenagem.geojson",
        generateId: true,
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
      { id: "basemap", type: "raster", source: "basemap" },

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
        filter: ["==", ["get", "nm_tipo_curso_hidrografia"], "Trecho canalizado subterrâneo"],
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
        filter: ["==", ["get", "nm_tipo_curso_hidrografia"], "Trecho canalizado subterrâneo"],
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
        filter: ["==", ["get", "nm_tipo_curso_hidrografia"], "Trecho canalizado a céu aberto"],
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
        filter: ["==", ["get", "nm_tipo_curso_hidrografia"], "Trecho em estado natural"],
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
          "text-field": ["coalesce", ["get", "nm_acidente"], ""],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-letter-spacing": 0.06,
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": "#f4ede0",
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
