"use client";

import { useEffect, useState } from "react";
import { BURIAL_COLOR, BURIAL_LABEL_PT } from "@/lib/rivers";

const order: Array<keyof typeof BURIAL_COLOR> = ["natural", "open", "buried", "lake"];

// Bottom-right, clear of the scrollytelling column (left) and of Next's dev
// badge (bottom-left). Collapsible so it stays out of the way on small screens.
export default function Legend() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }, []);

  return (
    <div className="pointer-events-auto absolute bottom-10 right-4 z-30 w-60 rounded-lg border border-black/10 bg-paper/95 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-serif text-sm font-semibold uppercase tracking-wider text-ink/80"
      >
        <span>Status dos cursos d&apos;água</span>
        <span aria-hidden className="text-xs text-ink/50">
          {open ? "▾" : "▴"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ul className="space-y-1.5 text-xs">
            {order.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span
                  className="inline-block h-[3px] w-6 rounded-full"
                  style={{
                    background: BURIAL_COLOR[k],
                    outline: k === "buried" ? "1px dashed " + BURIAL_COLOR[k] : undefined,
                  }}
                />
                <span className={k === "buried" ? "font-medium text-river-buried" : ""}>
                  {BURIAL_LABEL_PT[k]}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-black/10 pt-2 text-[10px] leading-tight text-ink/55">
            Fonte: GeoSampa (Prefeitura de São Paulo) · camada <em>drenagem</em>
          </div>
        </div>
      )}
    </div>
  );
}
