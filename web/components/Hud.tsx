"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap, MapMouseEvent } from "maplibre-gl";
import stats from "@/lib/generated/stats.json";
import { getStory } from "@/lib/storyStore";

// Instrument layer over the map: corner brackets, a live position readout
// (cursor in explore mode, map centre in the story) and the dataset tag.
// Decoration only: hidden from assistive tech, never takes pointer input.

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}°${v < 0 ? neg : pos}`;
const pad3 = (v: number) => String(Math.round(((v % 360) + 360) % 360)).padStart(3, "0");
const kmFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const SEGMENTS = Object.values(stats.segments).reduce((a, b) => a + b, 0);

export default function Hud({ map }: { map: MLMap }) {
  const posRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cursor: { lng: number; lat: number } | null = null;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const explore = getStory().mode === "explore";
      const at = explore && cursor ? cursor : map.getCenter();
      if (posRef.current) posRef.current.textContent = `${fmt(at.lat, "N", "S")}  ${fmt(at.lng, "E", "W")}`;
      if (camRef.current)
        camRef.current.textContent = `Z ${map.getZoom().toFixed(2)}  RUMO ${pad3(map.getBearing())}°  INCL ${pad3(map.getPitch()).slice(1)}°`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onMouse = (e: MapMouseEvent) => {
      cursor = e.lngLat;
      schedule();
    };
    const onLeave = () => {
      cursor = null;
      schedule();
    };
    map.on("move", schedule);
    map.on("mousemove", onMouse);
    map.on("mouseout", onLeave);
    draw();
    return () => {
      map.off("move", schedule);
      map.off("mousemove", onMouse);
      map.off("mouseout", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [map]);

  return (
    <div aria-hidden className="hud pointer-events-none absolute inset-0 z-10 hidden md:block">
      <span className="hud-corner left-3 top-3 border-l border-t" />
      <span className="hud-corner right-3 top-3 border-r border-t" />
      <span className="hud-corner bottom-3 left-3 border-b border-l" />
      <span className="hud-corner bottom-3 right-3 border-b border-r" />
      <div className="absolute bottom-[84px] right-5 text-right font-mono text-[10px] uppercase leading-[1.6] tracking-[0.14em] text-neblina/80">
        <div className="text-garoa/80" ref={posRef} />
        <div ref={camRef} />
        <div className="text-muro">
          GeoSampa · {kmFmt.format(SEGMENTS)} seg · {kmFmt.format(stats.km_total)} km
        </div>
      </div>
    </div>
  );
}
