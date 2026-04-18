#!/usr/bin/env python3
"""Trim GeoJSON size: round coords to ~1m precision, drop unused props.

Usage: slim-geojson.py <in.geojson> <out.geojson> [keep_props_comma_sep]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def round_coords(coords, precision: int = 5):
    if isinstance(coords, (int, float)):
        return round(coords, precision)
    return [round_coords(c, precision) for c in coords]


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    keep = set(sys.argv[3].split(",")) if len(sys.argv) > 3 and sys.argv[3] else None

    data = json.loads(src.read_text())
    out_features = []
    for f in data.get("features", []):
        geom = f.get("geometry")
        if not geom:
            continue
        geom["coordinates"] = round_coords(geom["coordinates"], 5)
        props = f.get("properties") or {}
        if keep is not None:
            props = {k: v for k, v in props.items() if k in keep}
        out_features.append({"type": "Feature", "geometry": geom, "properties": props})
    out = {"type": "FeatureCollection", "features": out_features}
    dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"{src.name}: {src.stat().st_size // 1024} KB -> {dst.name}: {dst.stat().st_size // 1024} KB  ({len(out_features)} features)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
