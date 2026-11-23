"use client";

import { useEffect, useState } from "react";

function Swatch({ kind }: { kind: "rio" | "canal" | "enterrado" | "enchente" }) {
  if (kind === "enchente") return <span className="inline-block h-3 w-6 bg-enchente/50" />;
  if (kind === "canal")
    return (
      <span className="inline-flex h-[6px] w-6 items-center bg-muro">
        <span className="h-[2px] w-full bg-canal" />
      </span>
    );
  if (kind === "enterrado")
    return (
      <span
        className="inline-block h-[3px] w-6"
        style={{
          background: "repeating-linear-gradient(90deg, #FFC766 0 5px, transparent 5px 9px)",
          boxShadow: "0 0 6px #F5A524",
        }}
      />
    );
  return <span className="inline-block h-[3px] w-6 bg-rio shadow-[0_0_6px_#4FB8E6]" />;
}

const ROWS = [
  { kind: "rio" as const, label: "Rio a céu aberto" },
  { kind: "canal" as const, label: "Canal de concreto" },
  { kind: "enterrado" as const, label: "Rio enterrado" },
];

/** Compact key used inside the B1 story panel. */
export function Chave({ className = "" }: { className?: string }) {
  return (
    <ul className={`space-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-neblina ${className}`}>
      {ROWS.map((r) => (
        <li key={r.kind} className="flex items-center gap-3">
          <Swatch kind={r.kind} />
          <span className={r.kind === "enterrado" ? "text-sodio-claro" : ""}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Explore-mode legend; bottom-left on desktop, collapsible (collapsed on phones). */
export default function Legend() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }, []);
  return (
    <div className="panel pointer-events-auto absolute bottom-8 left-4 z-30 w-60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between px-3 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-garoa"
      >
        Legenda <span aria-hidden className="text-neblina">{open ? "▾" : "▴"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <Chave />
          <div className="mt-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-neblina">
            <Swatch kind="enchente" /> Mancha de 100 anos
          </div>
          <div className="mt-3 border-t border-muro/40 pt-2 font-mono text-[10px] leading-tight text-neblina">
            Fonte: GeoSampa (Prefeitura de São Paulo) · limite IBGE
          </div>
        </div>
      )}
    </div>
  );
}
