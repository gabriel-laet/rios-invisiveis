"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS } from "@/lib/rivers";

export default function Scrollytelling() {
  const refs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const slug = (visible.target as HTMLElement).dataset.slug;
        if (!slug) return;
        window.dispatchEvent(new CustomEvent("rios:chapter", { detail: { slug } }));
      },
      {
        rootMargin: "-30% 0px -30% 0px",
        threshold: [0.25, 0.5, 0.75],
      },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      <div className="pointer-events-auto ml-0 w-full max-w-[440px] overflow-y-auto">
        <div className="flex flex-col">
          {CHAPTERS.map((ch, i) => (
            <section
              key={ch.slug}
              data-slug={ch.slug}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="mx-4 my-[40vh] rounded-xl border border-black/10 bg-paper/95 p-6 shadow-2xl backdrop-blur first:mt-[20vh] last:mb-[60vh]"
            >
              {i === 0 && (
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink/50">
                  São Paulo · rios invisíveis
                </div>
              )}
              <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">
                {ch.title}
              </h2>
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
        </div>
      </div>
    </div>
  );
}
