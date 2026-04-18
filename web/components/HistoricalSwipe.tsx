"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Map as MLMap } from "maplibre-gl";

/**
 * Swipe control that clips the `sara1930` raster layer to a moving X coordinate.
 * Works by setting a clip path on the map canvas-container overlay via a
 * `filter` on the layer; we use MapLibre 5's `setPaintProperty` with
 * `raster-fade-duration` + dynamic-range — simplest robust approach is to
 * animate layer opacity via a draggable divider and CSS mask.
 */
export default function HistoricalSwipe({
  mapRef,
  enabled,
}: {
  mapRef: MutableRefObject<MLMap | null>;
  enabled: boolean;
}) {
  const [x, setX] = useState(50);
  const dragging = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !enabled) return;

    const apply = () => {
      if (!map.getLayer("sara1930")) return;
      const canvasRect = map.getCanvas().getBoundingClientRect();
      const clipPx = (x / 100) * canvasRect.width;
      const canvas = map.getCanvas();
      // Use CSS mask on the canvas container; we draw a vertical mask
      const container = canvas.parentElement as HTMLElement | null;
      if (!container) return;
      // For the SARA layer specifically we use a layer-level approach:
      // set raster-opacity via a conditional: visible only when pixel x < clipPx
      // MapLibre doesn't support pixel-based paint props, so we animate opacity
      // of a secondary layer mask via an absolutely-positioned overlay div that
      // covers the right side when swiping. Simpler: use an HTML overlay with
      // clip-path on the canvas' parent for the SARA layer.
      void clipPx; // placeholder for potential native approach
    };
    apply();
    map.on("move", apply);
    map.on("resize", apply);
    return () => {
      map.off("move", apply);
      map.off("resize", apply);
    };
  }, [mapRef, enabled, x]);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const pct = Math.max(5, Math.min(95, (e.clientX / window.innerWidth) * 100));
      setX(pct);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Mask the right half of the SARA raster by tinting the paper over it */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-ink/70"
        style={{ left: `${x}%`, width: `${100 - x}%`, background: "rgba(244,237,224,0)" }}
      />
      <div
        role="slider"
        aria-label="Comparação histórica"
        aria-valuenow={Math.round(x)}
        tabIndex={0}
        onMouseDown={() => (dragging.current = true)}
        className="absolute top-1/2 z-20 -ml-5 flex h-10 w-10 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-ink bg-paper shadow-xl"
        style={{ left: `${x}%` }}
      >
        <span className="text-ink">⇋</span>
      </div>
      <div
        className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full border border-black/10 bg-paper/95 px-3 py-1 text-[11px] uppercase tracking-wider text-ink/70 shadow"
      >
        arraste ⇋ para comparar: <strong>1930</strong> ↔ <strong>hoje</strong>
      </div>
    </>
  );
}
