"use client";

import type { Map as MLMap } from "maplibre-gl";

// One map per page; components that decorate it (callouts, "perto") grab it here.
let current: MLMap | null = null;
const waiters = new Set<(m: MLMap) => void>();

export function setMap(m: MLMap | null) {
  current = m;
  // dev-only handle for debugging in the console
  if (process.env.NODE_ENV !== "production") (window as unknown as { __riosMap?: MLMap | null }).__riosMap = m;
  if (m) waiters.forEach((w) => w(m));
  if (m) waiters.clear();
}

export function getMap(): MLMap | null {
  return current;
}

export function whenMap(): Promise<MLMap> {
  return current ? Promise.resolve(current) : new Promise((r) => waiters.add(r));
}

// Data the client needs outside MapLibre's worker (nearest search, callout anchors).
let rivers: Promise<GeoJSON.FeatureCollection> | null = null;
let city: Promise<GeoJSON.FeatureCollection> | null = null;

export function loadRivers() {
  rivers ??= fetch("/data/rios_sp.geojson").then((r) => r.json());
  return rivers;
}

export function loadCity() {
  city ??= fetch("/data/limite_sp.geojson").then((r) => r.json());
  return city;
}

export function bboxOf(fc: GeoJSON.FeatureCollection): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as number[];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  fc.features.forEach((f) => f.geometry && "coordinates" in f.geometry && walk(f.geometry.coordinates));
  return [minX, minY, maxX, maxY];
}
