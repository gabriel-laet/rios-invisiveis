"use client";

import { BURIAL_COLOR, BURIAL_LABEL_PT } from "@/lib/rivers";

const order: Array<keyof typeof BURIAL_COLOR> = ["natural", "open", "buried", "lake"];

export default function Legend() {
  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 z-30 w-60 rounded-lg border border-black/10 bg-paper/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 font-serif text-sm font-semibold uppercase tracking-wider text-ink/80">
        Status dos cursos d&apos;água
      </div>
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
  );
}
