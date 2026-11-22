"use client";

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
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
  { id: "osm", label: "OSM" },
  { id: "satellite", label: "Satélite" },
];

export default function LayerToggles({
  state,
  onChange,
}: {
  state: LayerState;
  onChange: (s: LayerState) => void;
}) {
  const set = <K extends keyof LayerState>(k: K, v: LayerState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-30 w-64 rounded-lg border border-black/10 bg-paper/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 font-serif text-sm font-semibold uppercase tracking-wider text-ink/80">
        Camadas
      </div>
      <div className="mb-3">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-ink/60">Base</div>
        <div className="flex gap-1">
          {BASES.map((b) => (
            <button
              key={b.id}
              onClick={() => set("base", b.id)}
              className={`flex-1 rounded border px-1.5 py-1 text-[11px] transition ${
                state.base === b.id
                  ? "border-ink bg-ink text-paper"
                  : "border-black/20 bg-paper hover:bg-black/5"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <Toggle label="Relevo 3D" checked={state.terrain3D} onChange={(v) => set("terrain3D", v)} />
      <Toggle label="Sombreamento" checked={state.hillshade} onChange={(v) => set("hillshade", v)} />
      <Toggle
        label="Mancha de inundação (100 anos)"
        checked={state.flood100}
        onChange={(v) => set("flood100", v)}
      />
      <Toggle label="Bacias hidrográficas" checked={state.basins} onChange={(v) => set("basins", v)} />
      <Toggle
        label="Sobreposição SARA 1930"
        checked={state.historical}
        onChange={(v) => set("historical", v)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-xs">
      <span>{label}</span>
      {/* Visual only: the wrapping <label> forwards clicks to the checkbox below.
          A click handler here as well would toggle twice (on, then straight off). */}
      <span
        aria-hidden
        className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full transition ${
          checked ? "bg-river-buried" : "bg-black/20"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 translate-x-0.5 translate-y-0.5 transform rounded-full bg-paper transition ${
            checked ? "translate-x-3.5" : ""
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
