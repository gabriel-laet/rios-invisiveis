#!/usr/bin/env python3
"""Clip the city-wide drainage network to São Paulo's boundary and slim it.

Usage: build-city-rivers.py <drenagem.geojson> <limite_sp.geojson> <out.geojson> [tolerance_deg]

Output props are compact because the file covers the whole municipality
(~28k segments):
  t   — n natural · o open channel · b buried · l lake/reservoir · u unknown
  nm  — river name (nm_acidente), title-cased, when present
  via — nearest street (nm_via_proximo), title-cased, when present

Needs shapely (run via `uv run --with shapely` if it isn't installed).
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

from shapely import set_precision
from shapely.geometry import mapping, shape
from shapely.prepared import prep

CODE = {
    "Trecho em estado natural": "n",
    "Trecho canalizado a céu aberto": "o",
    "Trecho canalizado subterrâneo": "b",
    "Trecho em lago ou reservatório": "l",
}

LOWER_WORDS = {"da", "de", "do", "das", "dos", "e"}
PREFIX = {"Corrego": "Córrego", "Ribeirao": "Ribeirão"}


def title_case(s: str) -> str:
    """'CORREGO DA MOOCA' -> 'Córrego da Mooca' (source names are uppercase)."""
    words = s.lower().split()
    out = [w if i > 0 and w in LOWER_WORDS else w[:1].upper() + w[1:] for i, w in enumerate(words)]
    if out:
        out[0] = PREFIX.get(out[0], out[0])
    return " ".join(out)


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    src, boundary, dst = (Path(a) for a in sys.argv[1:4])
    tol = float(sys.argv[4]) if len(sys.argv) > 4 else 0.00002  # ≈ 2 m

    city = shape(json.loads(boundary.read_text())["features"][0]["geometry"])
    city_p = prep(city)

    out = []
    counts: Counter[str] = Counter()
    for f in json.loads(src.read_text()).get("features", []):
        if not f.get("geometry"):
            continue
        g = shape(f["geometry"])
        if not city_p.intersects(g):
            continue
        if not city_p.contains(g):
            g = g.intersection(city)
        if tol:
            g = g.simplify(tol, preserve_topology=False)
        g = set_precision(g, 1e-5)
        if g.is_empty:
            continue
        p = f.get("properties") or {}
        t = CODE.get(p.get("nm_tipo_curso_hidrografia"), "u")
        props = {"t": t}
        if p.get("nm_acidente"):
            props["nm"] = title_case(p["nm_acidente"])
        if p.get("nm_via_proximo"):
            props["via"] = title_case(p["nm_via_proximo"])
        counts[t] += 1
        out.append({"type": "Feature", "geometry": mapping(g), "properties": props})

    dst.write_text(
        json.dumps({"type": "FeatureCollection", "features": out}, ensure_ascii=False, separators=(",", ":"))
    )
    print(f"{dst.name}: {len(out)} segments {dict(counts)}  ({dst.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
