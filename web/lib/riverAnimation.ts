// Moving water: the dash pattern of a line layer is shifted a little every tick,
// so dashes travel along the geometry (MapLibre can't animate dash offsets
// natively). Open rivers get small bright "particles"; buried rivers keep their
// amber dashes, but those now creep along too, water still moving underneath.
import type { Map as MLMap } from "maplibre-gl";
import { prefersReducedMotion } from "./storyStore";

type Flow = { layer: string; dash: number; gap: number; steps: number };

const FLOWS: Flow[] = [
  { layer: "net-flow", dash: 1.2, gap: 7, steps: 28 },
  { layer: "net-enterrado", dash: 2, gap: 1.5, steps: 14 },
  { layer: "cur-final-enterrado", dash: 2, gap: 1.5, steps: 14 },
  { layer: "foco-flow", dash: 1, gap: 5, steps: 22 },
];

const TICK_MS = 70;
// Every frame is a distinct entry in MapLibre's line atlas (one row each with
// butt caps); keep the total well under its height.

/** Dash pattern `[dash, gap]` shifted forward by `o` (0 ≤ o < dash + gap). */
export function shiftedDash(dash: number, gap: number, o: number): number[] {
  if (o <= 0) return [dash, gap];
  if (o <= gap) return [0, o, dash, gap - o];
  const head = o - gap; // part of the dash that wrapped to the front
  return [head, gap, dash - head, 0];
}

// Precompute every frame so each tick is just a setPaintProperty.
const FRAMES = FLOWS.map((f) =>
  Array.from({ length: f.steps }, (_, i) => shiftedDash(f.dash, f.gap, ((f.dash + f.gap) * i) / f.steps)),
);

/** Start the animation loop; returns a stop function. No-op under reduced motion. */
export function startRiverAnimation(map: MLMap): () => void {
  if (prefersReducedMotion()) return () => {};
  let raf = 0;
  let last = 0;
  let tick = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (now - last < TICK_MS) return;
    last = now;
    tick++;
    FLOWS.forEach((f, k) => {
      if (!map.getLayer(f.layer) || map.getLayoutProperty(f.layer, "visibility") === "none") return;
      map.setPaintProperty(f.layer, "line-dasharray", FRAMES[k][tick % f.steps]);
    });
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
