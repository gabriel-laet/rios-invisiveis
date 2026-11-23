// Curated history (docs/STORY_DESIGN.md §3.3). There is no per-segment burial
// date in GeoSampa, so only these named rivers animate; their final state is
// always today's real status from the data.
//
// certainty: "firme" = sourced/standard; "aproximado" = range is approximate;
// "verificar" = needs a source before publishing (the UI shows "c.").

export type Certainty = "firme" | "aproximado" | "verificar";
export type EventKind = "marco" | "retificacao" | "enterramento" | "era";

export type TimelineEvent = {
  id: string;
  from: number;
  to?: number;
  label: string;
  title: string;
  kind: EventKind;
  match: string[]; // exact `nm` values in rios_sp.geojson; "*" = all non-curated
  certainty: Certainty;
  source?: string;
  note?: string;
};

export const TIMELINE: TimelineEvent[] = [
  {
    id: "fundacao",
    from: 1554,
    label: "1554",
    title: "Fundação entre dois rios",
    kind: "marco",
    match: ["Córrego Anhangabau", "Rio Tamanduatei"],
    certainty: "firme",
  },
  {
    id: "anhangabau",
    from: 1906,
    to: 1938,
    label: "1906 — 1938",
    title: "Anhangabaú · aterro e galeria",
    kind: "enterramento",
    match: ["Córrego Anhangabau"],
    certainty: "verificar",
    note: "Confirmar início do aterro e conclusão das galerias.",
  },
  {
    id: "tamanduatei",
    from: 1911,
    to: 1925,
    label: "a partir de 1911",
    title: "Tamanduateí · retificação",
    kind: "retificacao",
    match: ["Rio Tamanduatei"],
    certainty: "verificar",
    note: "Fim (1925) é marcador de animação, não fato.",
  },
  {
    id: "pinheiros",
    from: 1928,
    to: 1955,
    label: "1928 — anos 1950",
    title: "Pinheiros · retificação",
    kind: "retificacao",
    match: ["Rio Pinheiros"],
    certainty: "aproximado",
  },
  {
    id: "plano-avenidas",
    from: 1930,
    label: "1930",
    title: "Plano de Avenidas",
    kind: "marco",
    match: [],
    certainty: "firme",
  },
  {
    id: "vales-avenidas",
    from: 1930,
    to: 1970,
    label: "anos 1930 — 1970",
    title: "Saracura, Itororó, Pacaembu sob avenidas",
    kind: "enterramento",
    match: ["Córrego Saracura", "Córrego Itororo", "Córrego Pacaembu"],
    certainty: "verificar",
    note: "Associação rio→avenida vem do campo `via` do GeoSampa; anos a verificar.",
  },
  {
    id: "tiete",
    from: 1937,
    to: 1965,
    label: "1937 — anos 1960",
    title: "Tietê · retificação",
    kind: "retificacao",
    match: ["Rio Tiete"],
    certainty: "aproximado",
  },
  {
    id: "regra",
    from: 1940,
    to: 2000,
    label: "1940 — 2000",
    title: "Enterrar vira regra",
    kind: "era",
    match: ["*"],
    certainty: "aproximado",
    note: "Faixa ilustrativa; não há data por trecho.",
  },
];

/** Names whose state animates with the year. */
export const CURATED_NAMES: string[] = Array.from(
  new Set(TIMELINE.filter((e) => e.kind !== "marco" && e.kind !== "era").flatMap((e) => e.match)),
);

export type RiverState = "vivo" | "obra" | "final";

/**
 * State of each curated river at year `y`. Ranges overlap (Anhangabaú 1906–1938,
 * Tamanduateí from 1911), so a river whose own beat has already been told stays
 * in its final state: the reader never sees a buried river come back.
 */
export function curatedStates(y: number, toldEvents: ReadonlySet<string> = new Set()): Record<RiverState, string[]> {
  const out: Record<RiverState, string[]> = { vivo: [], obra: [], final: [] };
  for (const name of CURATED_NAMES) {
    const ev = TIMELINE.find((e) => e.to && e.match.includes(name));
    if (!ev || !ev.to) continue;
    const state = toldEvents.has(ev.id) ? "final" : y < ev.from ? "vivo" : y < ev.to ? "obra" : "final";
    out[state].push(name);
  }
  return out;
}

/** The event that "owns" year y within a step, for the odometer's era label and "c." prefix. */
export function eventFor(id: string | undefined): TimelineEvent | undefined {
  return id ? TIMELINE.find((e) => e.id === id) : undefined;
}

export const NAME_PT: Record<string, string> = {
  "Córrego Anhangabau": "córrego Anhangabaú",
  "Rio Tamanduatei": "rio Tamanduateí",
  "Rio Pinheiros": "rio Pinheiros",
  "Rio Tiete": "rio Tietê",
  "Braco Tiete": "braço do Tietê",
  "Córrego Saracura": "córrego Saracura",
  "Córrego Itororo": "córrego Itororó",
  "Córrego Pacaembu": "córrego Pacaembu",
  "Córrego da Mooca": "córrego da Mooca",
  "Córrego do Cordeiro": "córrego do Cordeiro",
  "Córrego Pirajucara": "córrego Pirajuçara",
  "Córrego do Sapateiro": "córrego do Sapateiro",
  "Córrego da Traicao": "córrego da Traição",
  "Riacho do Ipiranga": "riacho do Ipiranga",
};

const GENERIC = /^(Córrego|Rio|Ribeirão|Riacho)\b/;

/** "Córrego Itororo" → "córrego Itororó" (in-sentence form). */
export function formatName(nm: string | null | undefined): string {
  if (!nm) return "um córrego sem nome";
  return NAME_PT[nm] ?? nm.replace(GENERIC, (w) => w.toLowerCase());
}

/** "Córrego Itororo" → "Córrego Itororó" (title form, for headings). */
export function formatTitle(nm: string | null | undefined): string {
  if (!nm) return "Córrego sem nome";
  const s = formatName(nm);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const VIA_PREFIX: Record<string, string> = {
  Av: "Av.",
  R: "R.",
  Pc: "Pça.",
  Pca: "Pça.",
  Al: "Al.",
  Es: "Estr.",
  Est: "Estr.",
  Tv: "Tv.",
  Vd: "Viad.",
  Pq: "Parque",
  Lg: "Lgo.",
};
const VIA_OVERRIDE: Record<string, string> = {
  "Av Vinte e Tres de Maio": "Av. 23 de Maio",
  "Av Nove de Julho": "Av. 9 de Julho",
};

/** "Av Vinte e Tres de Maio" → "Av. 23 de Maio"; "R Seresta do Amor" → "R. Seresta do Amor". */
export function formatVia(via: string | null | undefined): string | null {
  if (!via) return null;
  if (VIA_OVERRIDE[via]) return VIA_OVERRIDE[via];
  const [first, ...rest] = via.split(" ");
  return [VIA_PREFIX[first] ?? first, ...rest].join(" ");
}
