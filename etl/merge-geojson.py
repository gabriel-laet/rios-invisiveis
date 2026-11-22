#!/usr/bin/env python3
"""Merge paged WFS GeoJSON responses into one FeatureCollection.

Usage: merge-geojson.py <out.geojson> <expected_total> <page.json>...

Drops duplicate feature ids (in case pages overlap) and fails loudly if the
merged count doesn't match what the server reported as numberMatched.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    out = Path(sys.argv[1])
    expected = int(sys.argv[2])
    seen: set[str] = set()
    features = []
    for page in sys.argv[3:]:
        data = json.loads(Path(page).read_text())
        for f in data.get("features", []):
            fid = f.get("id")
            if fid is not None:
                if fid in seen:
                    continue
                seen.add(fid)
            features.append(f)
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    print(f"   merged {len(features)} features ({out.stat().st_size // 1024} KB)")
    if len(features) != expected:
        print(f"   ERROR: expected {expected} features, got {len(features)}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
