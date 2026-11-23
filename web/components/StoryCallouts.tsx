"use client";

import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import { STEP_BY_ID, type Callout } from "@/lib/story";
import { getStory, isMobile, subscribeStory } from "@/lib/storyStore";
import { loadRivers, whenMap } from "@/lib/mapHandle";

// Midpoint of the longest segment carrying a given name: a stable anchor for labels.
const anchors = new Map<string, [number, number]>();

async function anchorFor(nm: string): Promise<[number, number] | null> {
  if (anchors.has(nm)) return anchors.get(nm)!;
  const fc = await loadRivers();
  let best: GeoJSON.Position[] | null = null;
  let bestLen = 0;
  for (const f of fc.features) {
    if ((f.properties as { nm?: string } | null)?.nm !== nm) continue;
    const g = f.geometry;
    const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const line of lines) {
      let len = 0;
      for (let i = 1; i < line.length; i++) len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      if (len > bestLen) {
        bestLen = len;
        best = line;
      }
    }
  }
  if (!best) return null;
  const mid = best[Math.floor(best.length / 2)] as [number, number];
  anchors.set(nm, mid);
  return mid;
}

export function calloutElement(text: string, sub?: string) {
  const el = document.createElement("div");
  el.className = "callout";
  el.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:6px">
      <div style="width:1px;height:24px;background:#ECE8E1;opacity:.7"></div>
      <div style="transform:translateY(-14px)">
        <div class="display" style="font-size:14px;font-weight:700;color:#ECE8E1;text-shadow:0 0 6px #0E1316,0 0 2px #0E1316"></div>
        <div style="font-family:var(--font-newsreader);font-style:italic;font-size:14px;color:#A3ADB2;text-shadow:0 0 6px #0E1316"></div>
      </div>
    </div>`;
  const [t, s] = el.querySelectorAll<HTMLDivElement>(".display, .display + div");
  t.textContent = text;
  if (sub) s.textContent = sub;
  else s.remove();
  return el;
}

/** Per-step DOM labels (§3.4), shown after the camera settles. */
export default function StoryCallouts() {
  useEffect(() => {
    let markers: maplibregl.Marker[] = [];
    let shownFor = "";
    let cancelled = false;

    const clear = () => {
      markers.forEach((m) => m.remove());
      markers = [];
    };

    const show = async (stepId: string, callouts: Callout[]) => {
      const map = await whenMap();
      const list = isMobile() ? callouts.slice(0, 1) : callouts;
      const placed: maplibregl.Marker[] = [];
      for (const c of list) {
        const at = c.lngLat ?? (c.nm ? await anchorFor(c.nm) : null);
        if (!at || cancelled || getStory().stepId !== stepId) return;
        // On phones, centre the label over its point so it isn't clipped at the edge.
        const anchor = isMobile() ? "bottom" : "bottom-left";
        placed.push(new maplibregl.Marker({ element: calloutElement(c.text, c.sub), anchor }).setLngLat(at).addTo(map));
      }
      clear();
      markers = placed;
      const reveal = () => markers.forEach((m) => m.getElement().classList.add("on"));
      if (map.isMoving()) map.once("moveend", () => setTimeout(reveal, 300));
      else reveal();
    };

    const sync = () => {
      const s = getStory();
      const key = s.mode === "story" ? s.stepId : "";
      if (key === shownFor) return;
      shownFor = key;
      clear();
      const step = STEP_BY_ID[key];
      if (step?.callouts?.length) void show(key, step.callouts);
    };
    sync();
    const unsub = subscribeStory(sync);
    return () => {
      cancelled = true;
      unsub();
      clear();
    };
  }, []);
  return null;
}
