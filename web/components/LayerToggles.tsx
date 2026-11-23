"use client";

import { useState } from "react";
import type { BaseMapId } from "@/lib/mapStyle";

export type LayerState = {
  base: BaseMapId;
  terrain3D: boolean;
  hillshade: boolean;
  flood100: boolean;
  basins: boolean;
  historical: boolean;
};

const BASES: Array<{ id: BaseMapId; label: string }> = [
  { id: "agua", label: "Só água" },
  { id: "ruas", label: "Ruas" },
  { id: "cinza", label: "Cinza" },
  { id: "satelite", label: "Satélite" },
];

const HAS_SARA = !!process.env.NEXT_PUBLIC_SARA_TILES;

export default function LayerToggles({
  state,
  onChange,
}: {
  state: LayerState;
  onChange: (s: LayerState) => void;
}) {
  const [open, setOpen] = useState(true);
  const set = <K extends keyof LayerState>(k: K, v: LayerState[K]) => onChange({ ...state, [k]: v });

  return (
    <div className="panel pointer-events-auto absolute right-4 top-20 z-30 w-72 md:top-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between px-3 font-mono text-[11px] uppercase tracking-[0.12em]"
      >
        Camadas <span aria-hidden className="text-neblina">{open ? "▾" : "▴"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neblina">Base</div>
          <div className="mb-3 flex gap-1" role="radiogroup" aria-label="Mapa de base">
            {BASES.map((b) => (
              <button
                key={b.id}
                role="radio"
                aria-checked={state.base === b.id}
                onClick={() => set("base", b.id)}
                className={`min-h-[36px] flex-1 border px-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition ${
                  state.base === b.id ? "border-sodio bg-sodio text-asfalto" : "border-muro text-garoa hover:border-garoa"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <Toggle label="Relevo 3D" checked={state.terrain3D} onChange={(v) => set("terrain3D", v)} />
          <Toggle label="Sombreamento" checked={state.hillshade} onChange={(v) => set("hillshade", v)} />
          <Toggle label="Mancha de enchente (100 anos)" checked={state.flood100} onChange={(v) => set("flood100", v)} />
          <Toggle label="Bacias hidrográficas" checked={state.basins} onChange={(v) => set("basins", v)} />
          {HAS_SARA && (
            <Toggle label="Mapa SARA 1930" checked={state.historical} onChange={(v) => set("historical", v)} />
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      {/* Visual only: the <label> forwards clicks to the checkbox. */}
      <span
        aria-hidden
        className={`relative inline-flex h-4 w-7 flex-shrink-0 transition ${checked ? "bg-sodio" : "bg-muro/60"}`}
      >
        <span
          className={`inline-block h-3 w-3 translate-y-0.5 transform bg-asfalto transition ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <input
        type="checkbox"
        role="switch"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
