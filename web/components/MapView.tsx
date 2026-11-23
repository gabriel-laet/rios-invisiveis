"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, type MapMouseEvent } from "maplibre-gl";
import { applyBaseLook, basemapSource, buildStyle, cityMask, type BaseMapId } from "@/lib/mapStyle";
import { BURIAL_LABEL_PT, CHAPTERS, SP_CENTER, burialFromCode, type StoryMode } from "@/lib/rivers";
import Legend from "./Legend";
import LayerToggles, { type LayerState } from "./LayerToggles";
import HistoricalSwipe from "./HistoricalSwipe";

type HoverInfo = {
  x: number;
  y: number;
  name: string;
  status: string;
  nearStreet: string | null;
};

const DEFAULT_LAYERS: LayerState = {
  base: "rivers" as BaseMapId,
  terrain3D: false,
  hillshade: false,
  flood100: false,
  basins: false,
  historical: false,
};

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [activeChapter, setActiveChapter] = useState<string>("intro");
  const [mode, setMode] = useState<StoryMode>("story");
  const baseRef = useRef<BaseMapId>(DEFAULT_LAYERS.base);

  const initialStyle = useMemo(() => buildStyle(DEFAULT_LAYERS.base), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: SP_CENTER,
      zoom: 11,
      pitch: 0,
      bearing: 0,
      hash: false,
      attributionControl: { compact: true },
      maxPitch: 75,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }));

    map.on("load", () => {
      mapRef.current = map;
      setReady(true);
      fetch("/data/limite_sp.geojson")
        .then((r) => r.json())
        .then((fc: GeoJSON.FeatureCollection) => {
          const src = map.getSource("mask") as maplibregl.GeoJSONSource | undefined;
          src?.setData(cityMask(fc));
        })
        .catch(() => {});
    });

    const riverHoverLayers = ["rivers-natural", "rivers-channelized", "rivers-buried"];

    const onMove = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: riverHoverLayers });
      if (!features.length) {
        setHover(null);
        map.getCanvas().style.cursor = "";
        return;
      }
      const f = features[0];
      const p = (f.properties ?? {}) as Record<string, string | number | null>;
      map.getCanvas().style.cursor = "pointer";
      setHover({
        x: e.point.x,
        y: e.point.y,
        name: (p.nm as string) || "Córrego sem nome",
        status: BURIAL_LABEL_PT[burialFromCode(p.t as string | null)],
        nearStreet: (p.via as string) || null,
      });
    };

    map.on("zoomend", () => updateTerrainExaggeration(map));
    map.on("mousemove", onMove);
    map.on("mouseleave", () => setHover(null));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Only swap the basemap when it actually changed. Replacing just the raster
    // source keeps the GeoJSON sources (and their ~10 MB of data) in place.
    if (baseRef.current !== layers.base) {
      const prev = baseRef.current;
      baseRef.current = layers.base;
      // "rivers" just hides the raster; only swap tiles for a real basemap.
      if (layers.base !== "rivers" && layers.base !== prev) {
        map.removeLayer("basemap");
        map.removeSource("basemap");
        map.addSource("basemap", basemapSource(layers.base));
        map.addLayer({ id: "basemap", type: "raster", source: "basemap" }, "hillshade");
      }
      applyBaseLook(map, layers.base);
    }
    applyToggleVisibility(map, layers);
  }, [layers, ready]);

  // Fly to chapters
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ch = CHAPTERS.find((c) => c.slug === activeChapter);
    if (!ch) return;
    map.flyTo({
      center: ch.center,
      zoom: ch.zoom,
      pitch: ch.pitch,
      bearing: ch.bearing,
      essential: true,
      duration: 2200,
      curve: 1.4,
    });
    if (ch.pitch > 10 && !layers.terrain3D) {
      setLayers((s) => ({ ...s, terrain3D: true }));
    }
  }, [activeChapter, ready]);

  // Story mode: the map is a camera-driven backdrop. Explore: hand it over.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const handlers = [
      map.scrollZoom,
      map.dragPan,
      map.dragRotate,
      map.boxZoom,
      map.doubleClickZoom,
      map.keyboard,
      map.touchZoomRotate,
      map.touchPitch,
    ];
    handlers.forEach((h) => (mode === "explore" ? h.enable() : h.disable()));
    if (mode === "story") setHover(null);
  }, [mode, ready]);

  useEffect(() => {
    const handler = (e: Event) => {
      const m = (e as CustomEvent<{ mode: StoryMode }>).detail?.mode;
      if (m) setMode(m);
    };
    window.addEventListener("rios:mode", handler as EventListener);
    return () => window.removeEventListener("rios:mode", handler as EventListener);
  }, []);

  // Watch scroll position to sync chapter
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug) setActiveChapter(detail.slug);
    };
    window.addEventListener("rios:chapter", handler as EventListener);
    return () => window.removeEventListener("rios:chapter", handler as EventListener);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {layers.historical && ready && (
        <HistoricalSwipe mapRef={mapRef} enabled={layers.historical} />
      )}
      <Legend />
      <LayerToggles state={layers} onChange={setLayers} />
      {hover && (
        <div
          className="pointer-events-none absolute z-40 max-w-xs rounded-lg border border-black/10 bg-paper/95 px-3 py-2 shadow-xl backdrop-blur"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-serif text-base leading-tight">{hover.name}</div>
          <div className="mt-0.5 text-xs text-ink/70">{hover.status}</div>
          {hover.nearStreet && (
            <div className="mt-1 text-xs italic text-ink/60">sob {hover.nearStreet}</div>
          )}
        </div>
      )}
    </div>
  );
}

// The ~30 m Terrarium DEM looks spiky when exaggerated at street-level zooms,
// but São Paulo's relief is too subtle to read at city zoom without some
// boost. MapLibre's terrain.exaggeration can't be a zoom expression, so it is
// recomputed on zoomend: 1.3 at z≤11 → 1.0 at z13 → 0.8 at z≥15.
const EXAGGERATION_STOPS: Array<[number, number]> = [
  [11, 1.3],
  [13, 1.0],
  [15, 0.8],
];

function terrainExaggeration(zoom: number): number {
  const stops = EXAGGERATION_STOPS;
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z1, e1] = stops[i];
    if (zoom <= z1) {
      const [z0, e0] = stops[i - 1];
      return e0 + ((zoom - z0) / (z1 - z0)) * (e1 - e0);
    }
  }
  return stops[stops.length - 1][1];
}

function updateTerrainExaggeration(map: MLMap) {
  const terrain = map.getTerrain();
  if (!terrain) return;
  const next = Math.round(terrainExaggeration(map.getZoom()) * 20) / 20; // 0.05 steps
  if (Math.abs((terrain.exaggeration ?? 1) - next) < 0.01) return;
  map.setTerrain({ ...terrain, exaggeration: next });
}

function applyToggleVisibility(map: MLMap, layers: LayerState) {
  const setVis = (id: string, v: boolean) => {
    if (!map.getLayer(id)) return;
    map.setLayoutProperty(id, "visibility", v ? "visible" : "none");
  };
  setVis("hillshade", layers.hillshade);
  setVis("flood-100", layers.flood100);
  setVis("basins-outline", layers.basins);
  setVis("sara1930", layers.historical);

  if (layers.terrain3D) {
    try {
      if (map.getTerrain()) updateTerrainExaggeration(map);
      else map.setTerrain({ source: "terrarium", exaggeration: terrainExaggeration(map.getZoom()) });
    } catch {
      // ignore
    }
  } else {
    try {
      map.setTerrain(null);
    } catch {
      // ignore
    }
  }
}
