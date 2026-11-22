#!/usr/bin/env python3
"""Trim GeoJSON size: round coords to ~1m precision, drop unused props.

Usage: slim-geojson.py <in.geojson> <out.geojson> [keep_props_comma_sep]
                       [--dissolve <group_prop>] [--simplify <degrees>]

--dissolve unions all polygons that share <group_prop> into one (multi)polygon
per group, then simplifies it (default tolerance 0.00002° ≈ 2 m). Use it for
layers made of many small adjacent cells, like the flood extents. It needs
shapely; run the script through `uv run --with shapely` if it isn't installed.
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def round_coords(coords, precision: int = 5):
    if isinstance(coords, (int, float)):
        return round(coords, precision)
    return [round_coords(c, precision) for c in coords]


def dissolve(features: list[dict], group_prop: str, tolerance: float) -> list[dict]:
    from shapely import make_valid, set_precision, union_all
    from shapely.geometry import mapping, shape

    groups: dict[object, list] = defaultdict(list)
    for f in features:
        props = f.get("properties") or {}
        groups[props.get(group_prop)].append(make_valid(shape(f["geometry"])))

    out = []
    for key, geoms in groups.items():
        merged = union_all(geoms)
        if tolerance > 0:
            merged = merged.simplify(tolerance, preserve_topology=True)
        merged = set_precision(merged, 1e-5)
        if merged.is_empty:
            continue
        # Explode to single polygons so MapLibre can cull/tile them cheaply.
        parts = getattr(merged, "geoms", [merged])
        for part in parts:
            if part.geom_type != "Polygon" or part.is_empty:
                continue
            out.append(
                {
                    "type": "Feature",
                    "geometry": mapping(part),
                    "properties": {group_prop: key} if key is not None else {},
                }
            )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path)
    ap.add_argument("dst", type=Path)
    ap.add_argument("keep", nargs="?", default="")
    ap.add_argument("--dissolve", metavar="GROUP_PROP")
    ap.add_argument("--simplify", type=float, default=0.00002)
    args = ap.parse_args()

    keep = set(args.keep.split(",")) if args.keep else None
    src_size = args.src.stat().st_size
    data = json.loads(args.src.read_text())

    features = []
    for f in data.get("features", []):
        geom = f.get("geometry")
        if not geom:
            continue
        props = f.get("properties") or {}
        if keep is not None:
            props = {k: v for k, v in props.items() if k in keep}
        features.append({"type": "Feature", "geometry": geom, "properties": props})
    n_in = len(features)

    if args.dissolve:
        features = dissolve(features, args.dissolve, args.simplify)

    for f in features:
        f["geometry"]["coordinates"] = round_coords(f["geometry"]["coordinates"], 5)

    out = {"type": "FeatureCollection", "features": features}
    args.dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(
        f"{args.src.name}: {src_size // 1024} KB -> {args.dst.name}: {args.dst.stat().st_size // 1024} KB"
        f"  ({n_in} -> {len(features)} features)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
