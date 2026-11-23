"use client";

import { useEffect, useRef } from "react";
import { STEPS, yearAt, type StoryStep } from "@/lib/story";
import { getStory, setStory, subscribeStory, useStory } from "@/lib/storyStore";
import { backToStory, consumeReturnStep, enterExplore, startPerto } from "@/lib/modes";
import { Chave } from "./Legend";

/**
 * The story is ordinary document flow: the page scrolls, the map behind it is
 * fixed and non-interactive. One observer picks the active step (viewport
 * centre line); one rAF-throttled scroll listener turns scroll into progress
 * and year.
 */
export default function StoryScroller() {
  const mode = useStory((s) => s.mode);
  const refs = useRef<Array<HTMLElement | null>>([]);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // coming back from explore: land at the top of the hand-off beat once it's rendered
  useEffect(() => {
    if (mode !== "story") return;
    const target = consumeReturnStep();
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-step="${target}"]`);
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "instant" as ScrollBehavior });
  }, [mode]);

  // active step
  useEffect(() => {
    if (mode !== "story") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const step = STEPS.find((s) => s.id === el.dataset.step);
            if (!step) continue;
            // set step, progress and year together so nothing renders a mismatched pair
            const r = el.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (window.innerHeight / 2 - r.top) / r.height));
            setStory({ stepId: step.id, progress: p, year: yearAt(step, p) });
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [mode]);

  // progress + year within the active step
  useEffect(() => {
    if (mode !== "story") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const { stepId } = getStory();
      const i = STEPS.findIndex((s) => s.id === stepId);
      const el = refs.current[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (window.innerHeight / 2 - r.top) / r.height));
      setStory({ progress: p, year: yearAt(STEPS[i], p) });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The observer may switch steps after the last scroll event: recompute then too.
    let lastStep = getStory().stepId;
    const unsubStore = subscribeStory(() => {
      const id = getStory().stepId;
      if (id !== lastStep) {
        lastStep = id;
        onScroll();
      }
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      unsubStore();
      cancelAnimationFrame(raf);
    };
  }, [mode]);

  // scrolling past the end enters explore
  useEffect(() => {
    if (mode !== "story" || !sentinel.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) enterExplore();
    });
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [mode]);

  // deep link, browser back/forward
  useEffect(() => {
    if (location.hash === "#explorar" || new URLSearchParams(location.search).has("ponto")) {
      enterExplore({ push: false });
    }
    const onPop = () => {
      if (location.hash === "#explorar") enterExplore({ push: false });
      else backToStory({ fromPopState: true });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // J / K: next / previous step
  useEffect(() => {
    if (mode !== "story") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "j" && k !== "k") return;
      const i = STEPS.findIndex((s) => s.id === getStory().stepId);
      const next = refs.current[Math.max(0, Math.min(STEPS.length - 1, i + (k === "j" ? 1 : -1)))];
      if (!next) return;
      next.scrollIntoView({ block: "center", behavior: "smooth" });
      next.querySelector<HTMLElement>("[data-panel]")?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  return (
    <>
      <article
        className={`relative z-20 ${mode === "explore" ? "hidden" : ""}`}
        aria-label="A história dos rios de São Paulo"
      >
        {STEPS.map((step, i) => (
          <section
            key={step.id}
            data-step={step.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            style={{ minHeight: `${step.height ?? 100}vh` }}
            className="relative flex items-end md:block"
          >
            <Panel step={step} first={i === 0} />
          </section>
        ))}
        <div ref={sentinel} className="h-px" style={{ marginTop: "40vh" }} aria-hidden />
      </article>
    </>
  );
}

function Panel({ step, first }: { step: StoryStep; first: boolean }) {
  return (
    <div
      data-panel
      tabIndex={-1}
      className="panel sticky bottom-0 mx-4 mb-4 max-h-[45vh] w-[calc(100%-2rem)] overflow-y-auto p-5 md:bottom-auto md:top-[30vh] md:mx-0 md:mb-0 md:ml-[6vw] md:max-h-none md:w-[400px] md:p-7"
    >
      <div className="kicker">{step.kicker}</div>
      {first ? (
        <h1 className="display mt-3 text-[56px] md:text-[72px]">
          Rios
          <br />
          <span className="underline decoration-sodio decoration-dashed decoration-2 underline-offset-[10px]">
            invisíveis
          </span>
        </h1>
      ) : (
        <h2 className="display mt-3 text-[34px] md:text-[44px]">{step.title}</h2>
      )}
      {step.stat && (
        <div className="mt-5">
          <div className="display whitespace-nowrap text-[60px] text-sodio md:text-[80px]">{step.stat.value}</div>
          <div className="font-mono text-xs uppercase tracking-[0.12em] text-neblina">{step.stat.label}</div>
        </div>
      )}
      <p className="mt-4 text-[17px] leading-[1.5] text-garoa/90 md:text-[19px]">{step.body}</p>
      {step.legend && <Chave className="mt-5" />}
      {step.note && <p className="mt-4 font-mono text-[11px] leading-relaxed text-neblina">{step.note}</p>}
      {first && (
        <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-neblina" aria-hidden>
          ↓ role devagar
        </div>
      )}
      {step.cta === "perto" && (
        <div className="mt-6 flex flex-col items-start gap-3">
          <button type="button" className="btn btn-primary" onClick={() => startPerto("locate")}>
            ⌖ Encontrar o rio mais perto de mim
          </button>
          <button
            type="button"
            className="min-h-[44px] font-mono text-xs uppercase tracking-[0.08em] text-neblina underline underline-offset-4 hover:text-garoa"
            onClick={() => startPerto("pick")}
          >
            ou escolha um ponto no mapa
          </button>
          <p className="font-mono text-[11px] text-neblina">
            Sua localização fica só no seu navegador. Nada é enviado a servidor nenhum.
          </p>
        </div>
      )}
      {step.cta === "explorar" && (
        <button type="button" className="btn btn-primary mt-6" onClick={() => enterExplore()}>
          Explorar o mapa →
        </button>
      )}
    </div>
  );
}

/** First tab stop on the page (§6.4). */
export function SkipLink() {
  return (
    <a
      href="#explorar"
      onClick={(e) => {
        e.preventDefault();
        enterExplore();
      }}
      className="btn btn-primary fixed left-4 top-4 z-50 -translate-y-24 focus:translate-y-0"
    >
      Pular para o mapa
    </a>
  );
}
