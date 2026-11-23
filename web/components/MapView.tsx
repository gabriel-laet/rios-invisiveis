"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, type MapMouseEvent } from "maplibre-gl";
import { applyBase, applyNetwork, buildStyle, cityMask, setLayerVisible, type BaseMapId } from "@/lib/mapStyle";
import { STEP_BY_ID, toldBefore, type Camera, type StoryStep } from "@/lib/story";
import { formatTitle, formatVia } from "@/lib/timeline";
import { getStory, isMobile, prefersReducedMotion, setStory, subscribeStory, useStory } from "@/lib/storyStore";
import { bboxOf, loadCity, setMap } from "@/lib/mapHandle";
import LayerToggles, { type LayerState } from "./LayerToggles";
import Legend from "./Legend";
import HistoricalSwipe from "./HistoricalSwipe";

const STATUS: Record<string, string> = {
  n: "A céu aberto",
  l: "Lago ou represa",
  o: "Canal de concreto",
  b: "Enterrado",
};

type Hover = { x: number; y: number; name: string; status: string; t: string; via: string | null };

const DEFAULT_LAYERS: LayerState = {
  base: "agua",
  terrain3D: false,
  hillshade: true,
  flood100: false,
  basins: false,
  historical: false,
};

const SP_CENTER: [number, number] = [-46.63, -23.68];

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const cityBounds = useRef<[number, number, number, number] | null>(null);
  const [ready, setReady] = useState(false);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [hover, setHover] = useState<Hover | null>(null);
  const mode = useStory((s) => s.mode);

  // ---- create the map -------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: SP_CENTER,
      zoom: 9.6,
      attributionControl: { compact: true },
      maxPitch: 75,
      fadeDuration: 0,
    });
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");
    setInteractive(map, false);

    map.on("load", async () => {
      const city = await loadCity().catch(() => null);
      if (city) {
        (map.getSource("mask") as maplibregl.GeoJSONSource).setData(cityMask(city));
        cityBounds.current = bboxOf(city);
      }
      mapRef.current = map;
      setMap(map);
      setReady(true);
      setStory({ mapReady: true });
    });

    map.on("zoomend", () => updateTerrainExaggeration(map));

    const hoverLayers = ["net-vivo", "net-canal", "net-enterrado"];
    const onMove = (e: MapMouseEvent) => {
      if (getStory().mode !== "explore") return;
      const f = map.queryRenderedFeatures(e.point, { layers: hoverLayers })[0];
      if (!f) {
        setHover(null);
        map.getCanvas().style.cursor = "";
        return;
      }
      const p = (f.properties ?? {}) as Record<string, string | undefined>;
      map.getCanvas().style.cursor = "pointer";
      setHover({
        x: e.point.x,
        y: e.point.y,
        name: formatTitle(p.nm),
        status: STATUS[p.t ?? ""] ?? "",
        t: p.t ?? "",
        via: formatVia(p.via),
      });
    };
    map.on("mousemove", onMove);
    map.on("click", onMove); // tap tooltips on touch
    map.on("mouseleave", () => setHover(null));

    return () => {
      setMap(null);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- story: camera + layers per step, network per year --------------------
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    let lastStep = "";
    let lastNetKey = "";
    let lastLate = false;
    let lastStepAt = 0;
    let lastMode = "";

    const sync = () => {
      const s = getStory();
      if (s.mode !== lastMode) {
        lastMode = s.mode;
        lastStep = ""; // re-apply the step when coming back from explore
        lastNetKey = "";
      }
      if (s.mode !== "story") return;
      const step = STEP_BY_ID[s.stepId];
      if (!step) return;

      if (step.id !== lastStep) {
        const fast = performance.now() - lastStepAt < 400;
        lastStepAt = performance.now();
        lastStep = step.id;
        lastLate = false;
        moveCamera(map, step.camera, cityBounds.current, fast);
        applyStepLayers(map, step);
      }
      if (step.cameraLate && s.progress >= 0.5 !== lastLate) {
        lastLate = s.progress >= 0.5;
        moveCamera(map, lastLate ? step.cameraLate : step.camera, cityBounds.current, false);
      }

      const yearKey = typeof s.year === "number" ? Math.floor(s.year) : s.year;
      const netKey = `${step.id}|${yearKey}|${step.network === "regra" ? s.progress.toFixed(2) : ""}`;
      if (netKey !== lastNetKey) {
        lastNetKey = netKey;
        applyNetwork(map, {
          network: step.network,
          year: s.year,
          progress: s.progress,
          focus: step.focus,
          glow: step.glow,
          told: toldBefore(step.id),
        });
      }
    };
    sync();
    return subscribeStory(sync);
  }, [ready]);

  // ---- mode switch ------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    setInteractive(map, mode === "explore");
    const canvas = map.getCanvas();
    canvas.setAttribute("aria-hidden", mode === "explore" ? "false" : "true");
    canvas.tabIndex = mode === "explore" ? 0 : -1;
    canvas.setAttribute("aria-label", "Mapa interativo dos rios de São Paulo");
    if (mode === "explore") {
      applyNetwork(map, { network: "atual", year: "HOJE", progress: 1 });
      applyExploreLayers(map, layers);
    } else {
      setHover(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready]);

  // ---- explore: layer toggles -----------------------------------------------------
  useEffect(() => {
    if (!ready || mode !== "explore") return;
    applyExploreLayers(mapRef.current!, layers);
  }, [layers, ready, mode]);

  return (
    // In the story the map is decoration: not focusable, not clickable, hidden from AT.
    <div className={`fixed inset-0 ${mode === "explore" ? "" : "pointer-events-none"}`} inert={mode !== "explore"}>
      <div ref={containerRef} className="absolute inset-0" />
      {mode === "explore" && (
        <>
          {layers.historical && ready && <HistoricalSwipe mapRef={mapRef} enabled />}
          <Legend />
          <LayerToggles state={layers} onChange={setLayers} />
        </>
      )}
      {hover && mode === "explore" && (
        <div
          className="panel pointer-events-none absolute z-40 max-w-xs px-3 py-2"
          style={{ left: Math.min(hover.x + 14, window.innerWidth - 240), top: hover.y + 14 }}
        >
          <div className="display text-base">{hover.name}</div>
          <div
            className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${hover.t === "b" ? "text-sodio-claro" : "text-neblina"}`}
          >
            {hover.status}
          </div>
          {hover.via && (
            <div className="mt-1 text-sm italic text-neblina">
              {hover.t === "b" ? "sob a " : "perto da "}
              {hover.via}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------

function setInteractive(map: MLMap, on: boolean) {
  [
    map.scrollZoom,
    map.dragPan,
    map.dragRotate,
    map.boxZoom,
    map.doubleClickZoom,
    map.keyboard,
    map.touchZoomRotate,
    map.touchPitch,
  ].forEach((h) => (on ? h.enable() : h.disable()));
}

function padding() {
  if (isMobile()) return { top: 64, bottom: Math.round(window.innerHeight * 0.45), left: 0, right: 0 };
  return { top: 40, bottom: 40, left: 480, right: 80 };
}

export function moveCamera(
  map: MLMap,
  cam: Camera,
  cityBounds: [number, number, number, number] | null,
  fast: boolean,
) {
  const reduce = prefersReducedMotion();
  const mobile = isMobile();
  const pad = padding();
  let target: maplibregl.FlyToOptions;
  if ("fit" in cam) {
    if (!cityBounds) return;
    const opts = map.cameraForBounds(cityBounds, { padding: pad, bearing: cam.bearing ?? 0 });
    if (!opts) return;
    target = { ...opts, pitch: cam.pitch ?? 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } };
  } else {
    target = {
      center: cam.center,
      zoom: cam.zoom + (mobile ? -0.6 : 0),
      pitch: reduce ? Math.min(cam.pitch, 30) : cam.pitch,
      bearing: cam.bearing,
      padding: pad,
    };
  }
  if (reduce) map.jumpTo(target as maplibregl.JumpToOptions);
  else if (fast) map.stop().easeTo({ ...target, duration: 800 });
  else map.flyTo({ ...target, duration: mobile ? 1800 : 2400, curve: 1.3, essential: true });
}

function applyStepLayers(map: MLMap, step: StoryStep) {
  const l = step.layers ?? {};
  applyBase(map, "agua");
  setLayerVisible(map, "hillshade", true);
  setLayerVisible(map, "flood-100", !!l.flood);
  setLayerVisible(map, "streets", !!l.streets);
  setLayerVisible(map, "basins", false);
  setLayerVisible(map, "sara1930", false);
  setLayerVisible(map, "perto-prumo", false);
  setLayerVisible(map, "perto-ponto", false);
  map.setPaintProperty("mask", "fill-opacity", 0.92);
  setTerrain(map, !!l.terrain && !prefersReducedMotion());
}

function applyExploreLayers(map: MLMap, layers: LayerState) {
  applyBase(map, layers.base as BaseMapId);
  setLayerVisible(map, "hillshade", layers.hillshade);
  setLayerVisible(map, "flood-100", layers.flood100);
  setLayerVisible(map, "basins", layers.basins);
  setLayerVisible(map, "sara1930", layers.historical);
  setLayerVisible(map, "perto-prumo", true);
  setLayerVisible(map, "perto-ponto", true);
  map.setPaintProperty("mask", "fill-opacity", 0.85);
  setTerrain(map, layers.terrain3D);
}

// The ~30 m Terrarium DEM looks spiky when exaggerated at street-level zooms,
// but São Paulo's relief is too subtle to read at city zoom without some boost.
// MapLibre's terrain.exaggeration can't be a zoom expression, so it is
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
  const next = Math.round(terrainExaggeration(map.getZoom()) * 20) / 20;
  if (Math.abs((terrain.exaggeration ?? 1) - next) < 0.01) return;
  map.setTerrain({ ...terrain, exaggeration: next });
}

export function setTerrain(map: MLMap, on: boolean) {
  try {
    if (on) {
      if (map.getTerrain()) updateTerrainExaggeration(map);
      else map.setTerrain({ source: "terrarium", exaggeration: terrainExaggeration(map.getZoom()) });
    } else if (map.getTerrain()) {
      map.setTerrain(null);
    }
  } catch {
    // terrain source not ready yet
  }
}
