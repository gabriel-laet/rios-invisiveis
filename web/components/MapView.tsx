"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, type MapMouseEvent } from "maplibre-gl";
import { basemapSource, buildStyle, type BaseMapId } from "@/lib/mapStyle";
import { BURIAL_LABEL_PT, CHAPTERS, SP_CENTER, burialOf } from "@/lib/rivers";
import Legend from "./Legend";
import LayerToggles, { type LayerState } from "./LayerToggles";
import HistoricalSwipe from "./HistoricalSwipe";

type HoverInfo = {
  x: number;
  y: number;
  name: string;
  status: string;
  type: string | null;
  nearStreet: string | null;
};

const DEFAULT_LAYERS: LayerState = {
  base: "light" as BaseMapId,
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
        name: (p.nm_acidente as string) || "Córrego sem nome",
        status: BURIAL_LABEL_PT[burialOf(p.nm_tipo_curso_hidrografia as string | null)],
        type: (p.tx_tipo_acidente as string | null) || null,
        nearStreet: (p.nm_via_proximo as string | null) || null,
      });
    };

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
      baseRef.current = layers.base;
      const beforeId = map.getStyle().layers[1]?.id;
      map.removeLayer("basemap");
      map.removeSource("basemap");
      map.addSource("basemap", basemapSource(layers.base));
      map.addLayer({ id: "basemap", type: "raster", source: "basemap" }, beforeId);
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
          {hover.type && hover.type.trim() && (
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-ink/50">
              {hover.type}
            </div>
          )}
          {hover.nearStreet && (
            <div className="mt-1 text-xs italic text-ink/60">sob {hover.nearStreet}</div>
          )}
        </div>
      )}
    </div>
  );
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
      map.setTerrain({ source: "terrarium", exaggeration: 1.6 });
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
