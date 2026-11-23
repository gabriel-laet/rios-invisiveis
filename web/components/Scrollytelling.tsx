"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, type StoryMode } from "@/lib/rivers";

function announceMode(mode: StoryMode) {
  window.dispatchEvent(new CustomEvent("rios:mode", { detail: { mode } }));
}

function announceChapter(slug: string) {
  window.dispatchEvent(new CustomEvent("rios:chapter", { detail: { slug } }));
}

/**
 * Story mode: a full-viewport scroller sits over the map, so the wheel/touch
 * anywhere advances the story and the map just follows the chapter camera.
 * Explore mode: the scroller goes away and the map takes input; a button
 * brings the story back where it was.
 */
export default function Scrollytelling() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Array<HTMLElement | null>>([]);
  const savedScroll = useRef(0);
  const [mode, setMode] = useState<StoryMode>("story");

  useEffect(() => {
    if (mode !== "story") return;
    const root = scrollerRef.current;
    if (!root) return;
    root.scrollTop = savedScroll.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const slug = (visible?.target as HTMLElement | undefined)?.dataset.slug;
        if (slug) announceChapter(slug);
      },
      { root, rootMargin: "-30% 0px -30% 0px", threshold: [0.25, 0.5, 0.75] },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [mode]);

  const explore = () => {
    savedScroll.current = scrollerRef.current?.scrollTop ?? 0;
    setMode("explore");
    announceMode("explore");
  };

  const backToStory = () => {
    setMode("story");
    announceMode("story");
  };

  if (mode === "explore") {
    return (
      <button
        type="button"
        onClick={backToStory}
        className="absolute left-4 top-4 z-30 rounded-full border border-black/10 bg-paper/95 px-4 py-2 font-serif text-sm shadow-xl backdrop-blur hover:bg-paper"
      >
        ← Voltar à história
      </button>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="story-scroller absolute inset-0 z-20 overflow-y-auto overscroll-contain"
      aria-label="História dos rios de São Paulo"
    >
      <div className="flex w-full max-w-[440px] flex-col">
        {CHAPTERS.map((ch, i) => (
          <section
            key={ch.slug}
            data-slug={ch.slug}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="mx-4 my-[40vh] rounded-xl border border-black/10 bg-paper/95 p-6 shadow-2xl backdrop-blur first:mt-[20vh]"
          >
            {i === 0 && (
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink/50">
                São Paulo · rios invisíveis
              </div>
            )}
            <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">{ch.title}</h2>
            <div className="mt-1 font-serif text-base italic text-ink/60">{ch.subtitle}</div>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{ch.narrative}</p>
            {i === 0 && (
              <div className="mt-6 flex items-center gap-2 text-xs text-ink/60">
                <span aria-hidden>↓</span>
                <span>role para acompanhar os quatro rios centrais</span>
              </div>
            )}
          </section>
        ))}
        <section className="mx-4 mb-[45vh] mt-[30vh] rounded-xl border border-black/10 bg-paper/95 p-6 shadow-2xl backdrop-blur">
          <h2 className="font-serif text-2xl font-semibold leading-tight text-ink">Agora é com você</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
            Passe o mouse sobre qualquer córrego para saber o nome e a rua que corre por cima dele.
          </p>
          <button
            type="button"
            onClick={explore}
            className="mt-5 rounded-full bg-ink px-5 py-2.5 font-serif text-sm text-paper hover:bg-ink/85"
          >
            Explorar o mapa →
          </button>
        </section>
      </div>
    </div>
  );
}
