// "Rio perto de mim": nearest-watercourse search, entirely in the browser.
// The user's location never leaves the device.

export type RiverCode = "n" | "o" | "b" | "l" | "u";

export type RiverProps = { t: RiverCode; nm?: string; via?: string };

export type NearestHit = {
  props: RiverProps;
  /** metres from the query point to the closest point on the segment */
  distance: number;
  /** closest point on the river, [lon, lat] */
  point: [number, number];
  feature: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString, RiverProps>;
};

const R = 6371008.8; // mean Earth radius, m

/**
 * Nearest segment to `at` among features matching `filter`. Uses a local
 * equirectangular projection around the query point — accurate to well under
 * a metre at city scale, and fast enough for ~28k segments.
 */
export function nearestRiver(
  fc: GeoJSON.FeatureCollection,
  at: [number, number],
  filter: (p: RiverProps) => boolean = () => true,
): NearestHit | null {
  const [lon0, lat0] = at;
  const kx = ((Math.PI / 180) * R) * Math.cos((lat0 * Math.PI) / 180);
  const ky = (Math.PI / 180) * R;
  const toXY = (c: GeoJSON.Position) => [(c[0] - lon0) * kx, (c[1] - lat0) * ky] as const;

  let best: NearestHit | null = null;
  let bestD2 = Infinity;

  for (const f of fc.features) {
    const g = f.geometry;
    if (!g || (g.type !== "LineString" && g.type !== "MultiLineString")) continue;
    const props = (f.properties ?? {}) as RiverProps;
    if (!filter(props)) continue;
    const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = toXY(line[i]);
        const [bx, by] = toXY(line[i + 1]);
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        // projection of the origin (query point) onto segment AB, clamped
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
        const px = ax + t * dx;
        const py = ay + t * dy;
        const d2 = px * px + py * py;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = {
            props,
            distance: 0,
            point: [lon0 + px / kx, lat0 + py / ky],
            feature: f as NearestHit["feature"],
          };
        }
      }
    }
  }
  if (best) best.distance = Math.sqrt(bestD2);
  return best;
}

/** Ray-casting point-in-polygon against the city boundary (outer rings only). */
export function insideCity(boundary: GeoJSON.FeatureCollection, at: [number, number]): boolean {
  const [x, y] = at;
  const rings: GeoJSON.Position[][] = [];
  for (const f of boundary.features) {
    const g = f.geometry;
    if (g?.type === "Polygon") rings.push(g.coordinates[0]);
    else if (g?.type === "MultiPolygon") g.coordinates.forEach((p) => rings.push(p[0]));
  }
  return rings.some((ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
