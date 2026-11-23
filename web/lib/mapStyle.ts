// "Concreto e água, à noite" — map style (docs/STORY_DESIGN.md §1.4).
// No raster basemap by default: only São Paulo's outline and its water.
// No symbol layers, so no glyphs: every label that matters is a DOM callout.
import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  Map as MLMap,
  StyleSpecification,
} from "maplibre-gl";
import { P } from "./palette";
import { dataUrl } from "./paths";
import { CURATED_NAMES, curatedStates } from "./timeline";
import type { Network } from "./story";

export type BaseMapId = "agua" | "ruas" | "cinza" | "satelite";

const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
// Keyless vector tiles (OpenMapTiles schema), only used for faint street hints.
const OPENFREEMAP = "https://tiles.openfreemap.org/planet";
const SARA_TILES = process.env.NEXT_PUBLIC_SARA_TILES || "";

type Stops = Array<[number, number]>;
const byZoom = (stops: Stops, k = 1): ExpressionSpecification =>
  ["interpolate", ["linear"], ["zoom"], ...stops.flatMap(([z, v]) => [z, v * k])] as ExpressionSpecification;

const W = {
  passado: [[9, 0.4], [12, 0.8], [15, 1.6]] as Stops,
  casing: [[9, 1.4], [12, 2.4], [15, 5], [17, 9]] as Stops,
  canal: [[9, 0.6], [12, 1.1], [15, 2.4], [17, 4.5]] as Stops,
  vivoGlow: [[9, 2], [15, 8]] as Stops,
  vivo: [[9, 0.6], [12, 1.2], [15, 2.5], [17, 5]] as Stops,
  enterradoGlow: [[9, 2], [12, 5], [15, 12], [17, 22]] as Stops,
  enterrado: [[9, 0.5], [12, 1], [15, 2], [17, 3.5]] as Stops,
  flow: [[9, 0.9], [12, 1.6], [15, 3], [17, 5]] as Stops,
};

/** Base opacities; the network code scales these (focus dimming, the "regra" fade). */
const BASE_OPACITY: Record<string, number> = {
  "net-passado": 0.7,
  "net-canal-casing": 0.9,
  "net-canal": 1,
  "net-vivo-glow": 0.18,
  "net-vivo": 1,
  "net-enterrado-glow": 0.22,
  "net-enterrado": 0.95,
  "net-flow": 0.9,
};
const ATUAL_LAYERS = [
  "net-canal-casing",
  "net-canal",
  "net-vivo-glow",
  "net-vivo",
  "net-flow",
  "net-enterrado-glow",
  "net-enterrado",
];
const CURATED_LAYERS = ["cur-vivo", "cur-obra", "cur-final-canal", "cur-final-vivo", "cur-final-enterrado"];

type E = ExpressionSpecification;
const T = (code: string | string[]): E =>
  Array.isArray(code) ? ["in", ["get", "t"], ["literal", code]] : ["==", ["get", "t"], code];
const NM_IN = (names: string[]): E => ["in", ["coalesce", ["get", "nm"], ""], ["literal", names]];
const NONE: E = ["==", ["get", "t"], "__none__"];
const F = (e: E | null) => e as FilterSpecification | null;
const fade = { duration: 400, delay: 0 };

export function buildStyle(): StyleSpecification {
  const layers: LayerSpecification[] = [
    { id: "bg", type: "background", paint: { "background-color": P.asfalto } },
    {
      id: "basemap",
      type: "raster",
      source: "satellite",
      layout: { visibility: "none" },
      paint: { "raster-saturation": -0.8, "raster-brightness-max": 0.55, "raster-opacity": 0.6 },
    },
    { id: "land", type: "fill", source: "limite", paint: { "fill-color": P.chao } },
    {
      id: "hillshade",
      type: "hillshade",
      source: "hillshade",
      paint: {
        "hillshade-shadow-color": "rgba(0,0,0,0.55)",
        "hillshade-highlight-color": "rgba(236,232,225,0.07)",
        "hillshade-accent-color": P.asfalto,
        "hillshade-exaggeration": 0.3,
      },
    },
    // Survey grid: 0.05° lines always, 0.01° lines once you zoom in.
    {
      id: "graticule",
      type: "line",
      source: "graticule",
      paint: {
        "line-color": P.garoa,
        "line-width": ["case", ["get", "major"], 0.8, 0.5],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          ["case", ["get", "major"], 0.05, 0],
          13,
          ["case", ["get", "major"], 0.09, 0.04],
        ],
      },
    },
    {
      id: "streets",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
      layout: { visibility: "none" },
      paint: {
        "line-color": P.garoa,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 12, 0.06, 15, 0.14],
        "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 15, 1.2],
      },
    },
    {
      id: "flood-100",
      type: "fill",
      source: "flood100",
      layout: { visibility: "none" },
      paint: { "fill-color": P.enchente, "fill-opacity": 0.28 },
    },
    {
      id: "basins",
      type: "line",
      source: "basins",
      layout: { visibility: "none" },
      paint: { "line-color": P.neblina, "line-opacity": 0.25, "line-width": 0.8, "line-dasharray": [4, 3] },
    },
    {
      id: "water-fill",
      type: "fill",
      source: "water",
      paint: { "fill-color": P.lago, "fill-opacity": 0.55, "fill-outline-color": P.rio },
    },

    // Past-tense network: everything not curated, colour set by year in code.
    {
      id: "net-passado",
      type: "line",
      source: "rios",
      filter: ["!", NM_IN(CURATED_NAMES)],
      layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-color": P.memoria, "line-width": byZoom(W.passado), "line-opacity": 0.7, "line-opacity-transition": fade },
    },

    // Present-tense network: real status from GeoSampa.
    {
      id: "net-canal-casing",
      type: "line",
      source: "rios",
      filter: T("o"),
      paint: { "line-color": P.muro, "line-width": byZoom(W.casing), "line-opacity": 0.9, "line-opacity-transition": fade },
    },
    {
      id: "net-canal",
      type: "line",
      source: "rios",
      filter: T("o"),
      paint: { "line-color": P.canal, "line-width": byZoom(W.canal), "line-opacity": 1, "line-opacity-transition": fade },
    },
    {
      id: "net-vivo-glow",
      type: "line",
      source: "rios",
      filter: T(["n", "l"]),
      paint: {
        "line-color": P.rio,
        "line-width": byZoom(W.vivoGlow),
        "line-blur": 3,
        "line-opacity": 0.18,
        "line-opacity-transition": fade,
      },
    },
    {
      id: "net-vivo",
      type: "line",
      source: "rios",
      filter: T(["n", "l"]),
      layout: { "line-cap": "round" },
      paint: {
        "line-color": ["case", ["==", ["get", "t"], "l"], P.lago, P.rio],
        "line-width": byZoom(W.vivo),
        "line-opacity": 1,
        "line-opacity-transition": fade,
      },
    },
    // Particles drifting along open water (animated in riverAnimation.ts).
    {
      id: "net-flow",
      type: "line",
      source: "rios",
      filter: T(["n", "o"]),
      minzoom: 10,
      // Butt caps on purpose: each round-cap dash pattern costs ~15 rows of
      // MapLibre's line atlas, and the animation needs one pattern per frame.
      layout: { "line-cap": "butt" },
      paint: {
        "line-color": "#DDF4FF",
        "line-width": byZoom(W.flow),
        "line-dasharray": [1.2, 7],
        "line-opacity": 0.75,
        "line-opacity-transition": fade,
      },
    },
    {
      id: "net-enterrado-glow",
      type: "line",
      source: "rios",
      filter: T("b"),
      paint: {
        "line-color": P.sodio,
        "line-width": byZoom(W.enterradoGlow),
        "line-blur": ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 8],
        "line-opacity": 0.22,
        "line-opacity-transition": fade,
      },
    },
    {
      id: "net-enterrado",
      type: "line",
      source: "rios",
      filter: T("b"),
      paint: {
        "line-color": P.sodioClaro,
        "line-width": byZoom(W.enterrado),
        "line-dasharray": [2, 1.5],
        "line-opacity": 0.95,
        "line-opacity-transition": fade,
      },
    },

    // Curated rivers in the past: vivo → obra → final (today's real status).
    {
      id: "cur-vivo",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-color": P.rio, "line-width": byZoom(W.vivo, 1.6) },
    },
    {
      id: "cur-obra",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { visibility: "none" },
      paint: { "line-color": P.garoa, "line-width": byZoom(W.vivo, 1.4), "line-dasharray": [1, 1] },
    },
    {
      id: "cur-final-canal",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { visibility: "none" },
      paint: { "line-color": P.canal, "line-width": byZoom(W.canal, 1.4) },
    },
    {
      id: "cur-final-vivo",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { visibility: "none", "line-cap": "round" },
      paint: { "line-color": P.rio, "line-width": byZoom(W.vivo, 1.4) },
    },
    {
      id: "cur-final-enterrado",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { visibility: "none" },
      paint: { "line-color": P.sodioClaro, "line-width": byZoom(W.enterrado, 1.8), "line-dasharray": [2, 1.5] },
    },

    // Focus: whatever the step (or "Rio perto de mim") is talking about.
    {
      id: "foco-glow",
      type: "line",
      source: "rios",
      filter: NONE,
      paint: {
        "line-color": P.sodioClaro,
        "line-width": byZoom(W.vivo, 2.2 * 2.5),
        "line-blur": 6,
        "line-opacity": 0.5,
      },
    },

    {
      id: "foco",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { "line-cap": "round" },
      paint: {
        "line-color": ["match", ["get", "t"], "b", P.sodioClaro, "o", P.canal, "l", P.lago, P.rio],
        "line-width": byZoom(W.vivo, 1.8),
      },
    },

    {
      id: "foco-flow",
      type: "line",
      source: "rios",
      filter: NONE,
      layout: { "line-cap": "butt" },
      paint: { "line-color": "#FFF6E0", "line-width": byZoom(W.vivo, 2), "line-dasharray": [1, 5], "line-opacity": 0.9 },
    },

    { id: "mask", type: "fill", source: "mask", paint: { "fill-color": P.breu, "fill-opacity": 0.92 } },
    {
      id: "outline-glow",
      type: "line",
      source: "limite",
      paint: { "line-color": P.garoa, "line-width": 8, "line-blur": 8, "line-opacity": 0.06 },
    },
    {
      id: "outline",
      type: "line",
      source: "limite",
      paint: {
        "line-color": P.garoa,
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.2, 14, 2],
        "line-opacity": 0.55,
      },
    },

    // "Rio perto de mim"
    {
      id: "perto-prumo",
      type: "line",
      source: "perto",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": P.garoa, "line-width": 1.5, "line-dasharray": [1, 2] },
    },
    {
      id: "perto-ponto",
      type: "circle",
      source: "perto",
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-color": P.garoa, "circle-radius": 5, "circle-stroke-width": 2, "circle-stroke-color": P.asfalto },
    },
  ];

  if (SARA_TILES) {
    layers.splice(layers.findIndex((l) => l.id === "land") + 1, 0, {
      id: "sara1930",
      type: "raster",
      source: "sara1930",
      layout: { visibility: "none" },
      paint: { "raster-opacity": 0.85 },
    });
  }

  const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

  return {
    version: 8,
    sources: {
      satellite: { type: "raster", tiles: [SATELLITE], tileSize: 256, maxzoom: 19, attribution: "Esri, Maxar, Earthstar Geographics" },
      ofm: { type: "vector", url: OPENFREEMAP, attribution: "OpenFreeMap © OpenMapTiles © OpenStreetMap" },
      terrarium: {
        type: "raster-dem",
        tiles: [TERRARIUM],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 15,
        attribution: "Relevo: AWS Terrain Tiles",
      },
      hillshade: { type: "raster-dem", tiles: [TERRARIUM], tileSize: 256, encoding: "terrarium", maxzoom: 15 },
      limite: { type: "geojson", data: dataUrl("limite_sp.geojson"), attribution: "Limite: IBGE" },
      rios: {
        type: "geojson",
        data: dataUrl("rios_sp.geojson"),
        generateId: true,
        tolerance: 0.6,
        buffer: 64,
        attribution: "Rios: GeoSampa (Prefeitura de São Paulo)",
      },
      water: { type: "geojson", data: dataUrl("massa_d_agua.geojson") },
      flood100: { type: "geojson", data: dataUrl("mancha_inundacao_100.geojson") },
      basins: { type: "geojson", data: dataUrl("bacia_hidrografica.geojson") },
      mask: { type: "geojson", data: empty },
      graticule: { type: "geojson", data: graticule() },
      perto: { type: "geojson", data: empty },
      ...(SARA_TILES
        ? { sara1930: { type: "raster" as const, tiles: [SARA_TILES], tileSize: 256, attribution: "SARA Brasil 1930 · GeoSampa" } }
        : {}),
    },
    layers,
  };
}

/** Survey grid over the municipality's bbox (lines every 0.01°, every 5th "major"). */
function graticule(): GeoJSON.FeatureCollection {
  const [w, s, e, n] = [-47.0, -24.05, -46.3, -23.35];
  const features: GeoJSON.Feature[] = [];
  const line = (coords: GeoJSON.Position[], major: boolean): GeoJSON.Feature => ({
    type: "Feature",
    properties: { major },
    geometry: { type: "LineString", coordinates: coords },
  });
  for (let i = 0; i <= Math.round((e - w) / 0.01); i++) {
    const x = +(w + i * 0.01).toFixed(2);
    features.push(line([[x, s], [x, n]], i % 5 === 0));
  }
  for (let i = 0; i <= Math.round((n - s) / 0.01); i++) {
    const y = +(s + i * 0.01).toFixed(2);
    features.push(line([[w, y], [e, y]], i % 5 === 0));
  }
  return { type: "FeatureCollection", features };
}

/** World polygon with the city cut out. */
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
    if (g?.type === "Polygon") holes.push(g.coordinates[0]);
    else if (g?.type === "MultiPolygon") g.coordinates.forEach((poly) => holes.push(poly[0]));
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } };
}

const vis = (map: MLMap, id: string, on: boolean) => {
  if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
};
const opacity = (map: MLMap, id: string, v: number) => {
  if (map.getLayer(id)) map.setPaintProperty(id, "line-opacity", v);
};

export type NetworkState = {
  network: Network;
  year: number | string;
  progress: number;
  focus?: string[];
  glow?: "normal" | "forte";
  /** timeline events whose beat has already been told (their rivers stay final) */
  told?: ReadonlySet<string>;
};

/** Draw the river network for a story state (explore uses "atual"). */
export function applyNetwork(map: MLMap, s: NetworkState) {
  const focus = s.focus ?? [];
  const dim = focus.length ? 0.35 : 1;
  const y = typeof s.year === "number" ? s.year : 2026;

  map.setFilter("foco-glow", F(focus.length ? NM_IN(focus) : NONE));
  // In past-tense beats the curated layers already draw the focus rivers in their year's state.
  map.setFilter("foco", F(focus.length && s.network !== "passado" ? NM_IN(focus) : NONE));
  map.setFilter("foco-flow", F(focus.length ? NM_IN(focus) : NONE));

  // Present-tense layers
  const atualK = s.network === "atual" ? 1 : s.network === "regra" ? s.progress : 0;
  for (const id of ATUAL_LAYERS) {
    vis(map, id, atualK > 0);
    let o = BASE_OPACITY[id] * atualK * dim;
    if (id === "net-enterrado-glow" && s.glow === "forte") o = 0.45 * atualK * dim;
    opacity(map, id, o);
  }

  // Past-tense layers
  const passadoK = s.network === "passado" ? 1 : s.network === "regra" ? 1 - s.progress : 0;
  vis(map, "net-passado", passadoK > 0);
  if (passadoK > 0) {
    map.setPaintProperty("net-passado", "line-color", y < 1900 ? P.rio : P.memoria);
    opacity(map, "net-passado", BASE_OPACITY["net-passado"] * passadoK * dim);
    // in "regra" every segment fades together (no implied order)
    map.setFilter("net-passado", F(s.network === "regra" ? null : ["!", NM_IN(CURATED_NAMES)]));
  }

  // Curated rivers
  const showCurated = s.network === "passado";
  CURATED_LAYERS.forEach((id) => vis(map, id, showCurated));
  if (showCurated) {
    const st = curatedStates(y, s.told);
    map.setFilter("cur-vivo", F(st.vivo.length ? NM_IN(st.vivo) : NONE));
    map.setFilter("cur-obra", F(st.obra.length ? NM_IN(st.obra) : NONE));
    const fin = st.final.length ? NM_IN(st.final) : NONE;
    map.setFilter("cur-final-canal", F(["all", fin, T("o")]));
    map.setFilter("cur-final-vivo", F(["all", fin, T(["n", "l"])]));
    map.setFilter("cur-final-enterrado", F(["all", fin, T("b")]));
  }
}

export function setLayerVisible(map: MLMap, id: string, on: boolean) {
  vis(map, id, on);
}

/**
 * "cinza" is the satellite photo fully desaturated:
 * the city in grayscale, so only the water carries colour.
 */
export function applyBase(map: MLMap, base: BaseMapId) {
  const photo = base === "satelite" || base === "cinza";
  vis(map, "basemap", photo);
  vis(map, "land", !photo);
  vis(map, "streets", base === "ruas");
  if (map.getLayer("basemap")) {
    const gray = base === "cinza";
    map.setPaintProperty("basemap", "raster-saturation", gray ? -1 : -0.8);
    map.setPaintProperty("basemap", "raster-contrast", gray ? 0.25 : 0);
    map.setPaintProperty("basemap", "raster-brightness-max", gray ? 0.62 : 0.55);
    map.setPaintProperty("basemap", "raster-opacity", gray ? 0.85 : 0.6);
  }
}
