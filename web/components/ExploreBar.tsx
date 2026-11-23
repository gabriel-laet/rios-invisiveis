"use client";

import { useEffect, useRef, useState } from "react";
import { useStory } from "@/lib/storyStore";
import { backToStory, startPerto } from "@/lib/modes";

/** Explore-mode top bar: wordmark, back to the story, "Rio perto de mim". */
export default function ExploreBar() {
  const mode = useStory((s) => s.mode);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menu]);

  if (mode !== "explore") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex flex-wrap items-center gap-2 p-4">
      <span className="display mr-2 hidden text-lg md:inline">
        Rios <span className="underline decoration-sodio decoration-dashed decoration-2 underline-offset-4">invisíveis</span>
      </span>
      <button type="button" className="btn btn-ghost pointer-events-auto" onClick={() => backToStory()}>
        ← <span className="hidden sm:inline">Voltar à</span> história
      </button>
      <div ref={menuRef} className="pointer-events-auto relative">
        <button
          type="button"
          className="btn btn-primary"
          aria-expanded={menu}
          aria-haspopup="menu"
          onClick={() => setMenu((m) => !m)}
        >
          ⌖ Rio perto de mim
        </button>
        {menu && (
          <div role="menu" className="panel absolute left-0 top-full mt-2 w-72 p-2">
            <button
              role="menuitem"
              type="button"
              className="flex min-h-[44px] w-full items-center px-3 text-left text-sm hover:bg-garoa/10"
              onClick={() => {
                setMenu(false);
                startPerto("locate");
              }}
            >
              Usar minha localização
            </button>
            <button
              role="menuitem"
              type="button"
              className="flex min-h-[44px] w-full items-center px-3 text-left text-sm hover:bg-garoa/10"
              onClick={() => {
                setMenu(false);
                startPerto("pick");
              }}
            >
              Escolher um ponto no mapa
            </button>
            <p className="px-3 pb-2 pt-1 font-mono text-[10px] text-neblina">
              Sua localização fica só no seu navegador. Nada é enviado a servidor nenhum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
