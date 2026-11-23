"use client";

import { STEP_BY_ID, startYear } from "@/lib/story";
import { eventFor, TIMELINE } from "@/lib/timeline";
import { useStory } from "@/lib/storyStore";

const NOW = 2026;
const MIN = 1554;

/** Piecewise ruler scale: 1554–1900 gets the top 20 %, 1900–2026 the rest. */
export function rulerPos(y: number) {
  const c = Math.max(MIN, Math.min(NOW, y));
  return c <= 1900 ? ((c - MIN) / (1900 - MIN)) * 0.2 : 0.2 + ((c - 1900) / (NOW - 1900)) * 0.8;
}

function stepMeta(stepId: string) {
  const step = STEP_BY_ID[stepId];
  const ev = step && step.year.kind !== "word" ? eventFor(step.year.eventId) : undefined;
  return { step, ev };
}

function yearLabel(stepId: string): string {
  const { step } = stepMeta(stepId);
  if (!step) return "";
  const y = step.year;
  if (y.kind === "word") return y.word === "HOJE" ? "Ano: hoje" : y.word === "VOCÊ" ? "Agora: você" : `Quando: ${y.word.toLowerCase()}`;
  if (y.kind === "point") return `Ano: ${y.year}`;
  return `Anos: ${Math.min(y.from, y.to)} a ${Math.max(y.from, y.to)}`;
}

/** Rolling-digit counter styled after a residential water meter (§3.1). */
export function Hidrometro() {
  const year = useStory((s) => s.year);
  const stepId = useStory((s) => s.stepId);
  const { ev } = stepMeta(stepId);
  const uncertain = ev && ev.certainty !== "firme";
  const era = ev?.title ?? (typeof year === "string" ? "" : stepId === "rebobinar" ? "rebobinando" : "");

  return (
    <div
      className="flex flex-col items-end gap-1"
      aria-hidden
      data-year={typeof year === "number" ? Math.round(year) : year}
      data-odo-step={stepId}
      data-from={STEP_BY_ID[stepId] ? (startYear(STEP_BY_ID[stepId]) ?? undefined) : undefined}
      data-uncertain={uncertain && typeof year === "number" ? "1" : undefined}
    >
      <div className="flex items-end gap-2">
        {uncertain && typeof year === "number" && <span className="font-mono text-xs text-neblina">c.</span>}
        {typeof year === "number" ? (
          <div className="flex gap-[3px]">
            {String(Math.round(year))
              .padStart(4, "0")
              .split("")
              .map((d, i) => (
                <Digit key={i} d={Number(d)} last={i === 3} />
              ))}
          </div>
        ) : (
          <div className="display flex h-11 items-center border border-muro bg-[#0A0E10] px-3 text-[28px] md:h-14 md:text-[36px]">
            {year}
          </div>
        )}
      </div>
      {era && <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-neblina">{era}</div>}
    </div>
  );
}

function Digit({ d, last }: { d: number; last: boolean }) {
  return (
    <div
      className={`relative h-11 w-7 overflow-hidden border border-muro bg-[#0A0E10] md:h-14 md:w-9 ${last ? "text-sodio" : "text-garoa"}`}
    >
      <div
        className="display absolute inset-x-0 top-0 text-center text-[32px] leading-[44px] transition-transform duration-[180ms] ease-out motion-reduce:transition-none md:text-[42px] md:leading-[56px]"
        style={{ transform: `translateY(${-d * 10}%)`, fontVariationSettings: '"wdth" 62', fontVariantNumeric: "tabular-nums" }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <div key={n} className="h-11 md:h-14">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

/** River-gauge ruler (§3.2): vertical on desktop, a thin strip on mobile. */
export function Regua({ horizontal = false }: { horizontal?: boolean }) {
  const year = useStory((s) => s.year);
  const stepId = useStory((s) => s.stepId);
  const y = typeof year === "number" ? year : NOW;
  const pos = rulerPos(y);
  const active = STEP_BY_ID[stepId]?.year;
  const activeEvent = active && active.kind !== "word" ? active.eventId : undefined;
  const bands = TIMELINE.filter((e) => e.to);

  if (horizontal) {
    return (
      <div className="relative h-1 w-full bg-muro/40" aria-hidden>
        {bands.map((e) => (
          <div
            key={e.id}
            className={`absolute top-0 h-1 ${e.kind === "era" ? "bg-sodio/30" : "bg-sodio"}`}
            style={{ left: `${rulerPos(e.from) * 100}%`, width: `${(rulerPos(e.to!) - rulerPos(e.from)) * 100}%` }}
          />
        ))}
        <div className="absolute -top-1 h-3 w-[2px] bg-rio transition-[left] duration-200" style={{ left: `${pos * 100}%` }} />
      </div>
    );
  }

  const labels = [1554, 1700, 1800, 1900, 1950, 2000];
  const ticks = Array.from({ length: 13 }, (_, i) => 1900 + i * 10);
  return (
    <div className="relative h-[60vh] w-10" aria-hidden>
      {/* staff */}
      <div className="absolute inset-y-0 left-3 w-[3px] bg-garoa/15" />
      {ticks.map((t) => (
        <div
          key={t}
          className={`absolute left-3 h-px ${t % 50 === 0 ? "w-3 bg-garoa/60" : "w-2 bg-garoa/25"}`}
          style={{ top: `${rulerPos(t) * 100}%` }}
        />
      ))}
      {labels.map((t) => (
        <div
          key={t}
          className="absolute right-full mr-1 -translate-y-1/2 font-mono text-[10px] text-neblina"
          style={{ top: `${rulerPos(t) * 100}%` }}
        >
          {t}
        </div>
      ))}
      <div className="absolute left-0 -translate-y-1/2 font-mono text-[10px] text-neblina" style={{ top: "20%" }}>
        ≈
      </div>
      {/* event bands: uncertain ends fade out */}
      {bands.map((e) => {
        const top = rulerPos(e.from) * 100;
        const h = (rulerPos(e.to!) - rulerPos(e.from)) * 100;
        const soft = e.certainty !== "firme";
        const isActive = e.id === activeEvent;
        return (
          <div
            key={e.id}
            title={`${e.label} · ${e.title}`}
            className={`absolute left-[22px] w-[3px] ${isActive ? "opacity-100" : "opacity-50"}`}
            style={{
              top: `${top}%`,
              height: `${h}%`,
              background:
                e.kind === "era"
                  ? "repeating-linear-gradient(180deg, #F5A524 0 3px, transparent 3px 6px)"
                  : soft
                    ? "linear-gradient(180deg, #F5A524 85%, transparent)"
                    : "#F5A524",
            }}
          />
        );
      })}
      {/* water level */}
      <div
        className="absolute left-0 h-[2px] w-8 bg-rio shadow-[0_0_8px_#4FB8E6] transition-[top] duration-200 motion-reduce:transition-none"
        style={{ top: `${pos * 100}%` }}
      />
    </div>
  );
}

/** Fixed time device for story mode, plus a polite live region on step change. */
export default function TimeDevice() {
  const mode = useStory((s) => s.mode);
  const stepId = useStory((s) => s.stepId);
  if (mode !== "story") return null;
  return (
    <>
      <div className="sr-only" aria-live="polite">
        {yearLabel(stepId)}
      </div>
      {/* desktop */}
      <div className="pointer-events-none fixed right-6 top-6 z-30 hidden md:block">
        <Hidrometro />
      </div>
      <div className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 pt-16 md:block">
        <Regua />
      </div>
      {/* mobile: top bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 bg-asfalto/85 px-4 pb-2 pt-2 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <span className="display text-sm">Rios invisíveis</span>
          <div className="origin-right scale-75">
            <Hidrometro />
          </div>
        </div>
        <Regua horizontal />
      </div>
    </>
  );
}
