// The story, beat by beat (docs/STORY_DESIGN.md §2). After the rewind (B2),
// the year never goes backwards. Numbers come from the ETL (generated/stats.json).
import stats from "./generated/stats.json";
import { NAME_PT } from "./timeline";

export type Camera =
  | { center: [number, number]; zoom: number; pitch: number; bearing: number }
  | { fit: "municipio" | string[]; pitch?: number; bearing?: number; maxZoom?: number };

/** How the 27k segments are drawn: real status, the past (year-driven), or the fade between. */
export type Network = "atual" | "passado" | "regra";

export type YearSpec =
  | { kind: "point"; year: number; eventId?: string }
  | { kind: "range"; from: number; to: number; eventId?: string; band?: boolean }
  | { kind: "word"; word: string };

export type Callout = { lngLat?: [number, number]; nm?: string; text: string; sub?: string };

export type StoryStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  note?: string;
  year: YearSpec;
  camera: Camera;
  /** optional second camera once progress ≥ 0.5 (B8 pans east along the Tietê) */
  cameraLate?: Camera;
  layers?: Partial<{ flood: boolean; streets: boolean; terrain: boolean }>;
  network: Network;
  glow?: "normal" | "forte";
  focus?: string[];
  callouts?: Callout[];
  stat?: { value: string; label: string };
  cta?: "perto" | "explorar";
  legend?: boolean;
  /** section height in vh (scrub beats are taller) */
  height?: number;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");
const KM_TOTAL = stats.km_total;
const KM_BURIED = stats.km.b;
const KM_OPEN = stats.km.n + stats.km.o;
const longest = stats.buried_longest
  .slice(0, 3)
  .map((r) => `o ${(NAME_PT[r.nm] ?? r.nm).replace(/^córrego /, "")} (~${fmt(r.km)} km)`);

const CITY: Camera = { fit: "municipio", pitch: 0, bearing: 0 };
const CENTRO: Camera = { center: [-46.64, -23.57], zoom: 11.2, pitch: 0, bearing: 0 };

export const STEPS: StoryStep[] = [
  {
    id: "capa",
    kicker: "São Paulo · hoje",
    title: "Rios invisíveis",
    body: `São Paulo tem cerca de ${fmt(Math.round(KM_TOTAL / 100) * 100)} quilômetros de rios e córregos. Você atravessa vários todos os dias — por cima.`,
    year: { kind: "word", word: "HOJE" },
    camera: CITY,
    network: "atual",
  },
  {
    id: "chave",
    kicker: "Hoje",
    title: "Tiramos a cidade",
    body: `Sem ruas, sem prédios, sem trânsito. Sobrou a água, dentro do limite do município. Em azul, o rio que ainda vê o céu. Em âmbar, o que corre sob o asfalto: ${fmt(KM_BURIED)} km.`,
    year: { kind: "word", word: "HOJE" },
    camera: CENTRO,
    network: "atual",
    glow: "forte",
    legend: true,
  },
  {
    id: "rebobinar",
    kicker: "Rebobinando",
    title: "Volte no tempo",
    body: "Gire o hidrômetro para trás. Antes do asfalto, antes do bonde, antes da cidade: toda essa água corria a céu aberto.",
    note: "Os traçados são os de hoje. O desenho original, mais sinuoso, se perdeu com as obras.",
    year: { kind: "range", from: 2026, to: 1554 },
    camera: { center: [-46.64, -23.57], zoom: 11.6, pitch: 0, bearing: 0 },
    network: "passado",
    height: 180,
  },
  {
    id: "piratininga",
    kicker: "1554",
    title: "Entre dois rios",
    body: "A vila nasce no alto de uma colina, entre o Anhangabaú, a oeste, e o Tamanduateí, a leste. Água era defesa, caminho e abastecimento.",
    year: { kind: "point", year: 1554, eventId: "fundacao" },
    camera: { center: [-46.6334, -23.5479], zoom: 14.6, pitch: 60, bearing: -30 },
    layers: { terrain: true },
    network: "passado",
    focus: ["Córrego Anhangabau", "Rio Tamanduatei"],
    callouts: [
      { lngLat: [-46.6334, -23.5479], text: "Pátio do Colégio", sub: "onde a vila começou" },
      { nm: "Córrego Anhangabau", text: "Anhangabaú" },
      { nm: "Rio Tamanduatei", text: "Tamanduateí" },
    ],
  },
  {
    id: "anhangabau",
    kicker: "1906 — 1938",
    title: "O rio que virou vale",
    body: "A partir de 1906, o vale começa a ser aterrado. Em 1938, o Anhangabaú já corre em galeria. Hoje, atravessar o Anhangabaú é descer uma escada. O rio continua lá embaixo, sem pressa.",
    year: { kind: "range", from: 1906, to: 1938, eventId: "anhangabau" },
    camera: { center: [-46.639, -23.545], zoom: 14.5, pitch: 55, bearing: -20 },
    layers: { terrain: true },
    network: "passado",
    focus: ["Córrego Anhangabau"],
    callouts: [{ nm: "Córrego Anhangabau", text: "Vale do Anhangabaú", sub: "sob a Av. 23 de Maio e a Av. do Estado" }],
    height: 160,
  },
  {
    id: "tamanduatei",
    kicker: "A partir de 1911",
    title: "O rio em linha reta",
    body: "Era o rio do centro: água, roupa lavada, esgoto. A partir de 1911, perde as curvas e vira canal entre avenidas. A várzea do Carmo vira o Parque Dom Pedro II.",
    note: "A mancha azul é a área que uma chuva de 100 anos ainda alaga — a várzea que o rio não esqueceu.",
    year: { kind: "range", from: 1911, to: 1925, eventId: "tamanduatei" },
    camera: { center: [-46.625, -23.552], zoom: 13.6, pitch: 45, bearing: 0 },
    layers: { terrain: true, flood: true },
    network: "passado",
    focus: ["Rio Tamanduatei"],
    callouts: [{ nm: "Rio Tamanduatei", text: "Tamanduateí", sub: "hoje, canal entre avenidas" }],
    height: 160,
  },
  {
    id: "pinheiros",
    kicker: "1928 — anos 1950",
    title: "De rio sinuoso a canal",
    body: "Corria em curvas largas pela várzea oeste. A partir de 1928, a Light retifica o Pinheiros para gerar energia. A várzea vira loteamento. A enchente, não.",
    year: { kind: "range", from: 1928, to: 1955, eventId: "pinheiros" },
    camera: { center: [-46.697, -23.586], zoom: 12.5, pitch: 50, bearing: 25 },
    layers: { terrain: true, flood: true },
    network: "passado",
    focus: ["Rio Pinheiros"],
    callouts: [{ nm: "Rio Pinheiros", text: "Pinheiros", sub: "canal de concreto desde os anos 1950" }],
    height: 160,
  },
  {
    id: "avenidas",
    kicker: "1930 · Plano de Avenidas",
    title: "O vale vira avenida",
    body: "Em 1930, o Plano de Avenidas de Prestes Maia propõe uma ideia simples: o fundo do vale é o lugar perfeito para uma avenida. O córrego que se mude. O Saracura vira a Nove de Julho. O Itororó, a 23 de Maio.",
    year: { kind: "range", from: 1930, to: 1970, eventId: "vales-avenidas" },
    camera: { center: [-46.648, -23.547], zoom: 13.6, pitch: 40, bearing: -15 },
    layers: { streets: true, terrain: true },
    network: "passado",
    focus: ["Córrego Saracura", "Córrego Itororo", "Córrego Pacaembu"],
    callouts: [
      { nm: "Córrego Saracura", text: "Saracura", sub: "sob a Av. 9 de Julho" },
      { nm: "Córrego Itororo", text: "Itororó", sub: "sob a Av. 23 de Maio" },
      { nm: "Córrego Pacaembu", text: "Pacaembu", sub: "sob a Pça. Charles Miller" },
    ],
    height: 160,
  },
  {
    id: "tiete",
    kicker: "1937 — anos 1960",
    title: "O rio que definiu a cidade",
    body: "Por séculos foi a porta de saída para o interior. A partir de 1937, o Tietê é retificado e espremido entre as marginais. Mas siga o rio para o leste: perto da divisa, ele ainda corre em estado natural.",
    year: { kind: "range", from: 1937, to: 1965, eventId: "tiete" },
    camera: { center: [-46.69, -23.515], zoom: 12, pitch: 40, bearing: 10 },
    cameraLate: { center: [-46.5, -23.49], zoom: 11.4, pitch: 35, bearing: 0 },
    layers: { terrain: true, flood: true },
    network: "passado",
    focus: ["Rio Tiete", "Braco Tiete"],
    callouts: [{ lngLat: [-46.45, -23.49], text: "Tietê", sub: "ainda em estado natural" }],
    height: 180,
  },
  {
    id: "regra",
    kicker: "1940 — 2000",
    title: "Depois, virou regra",
    body: "Ninguém precisou de outro plano. Córrego virou galeria, galeria virou rua, rua virou endereço. Não sabemos o ano de cada trecho enterrado. Sabemos o resultado.",
    year: { kind: "range", from: 1940, to: 2000, eventId: "regra", band: true },
    camera: CENTRO,
    network: "regra",
    height: 180,
  },
  {
    id: "hoje",
    kicker: "Hoje",
    title: "O resultado",
    body: `Mais que a distância de São Paulo a Brasília pela estrada. Os mais longos: ${longest.join(", ")}.`,
    stat: { value: `${fmt(KM_BURIED)} km`, label: "de rios correm sob São Paulo" },
    year: { kind: "word", word: "HOJE" },
    camera: CITY,
    network: "atual",
    glow: "forte",
    focus: stats.buried_longest.slice(0, 3).map((r) => r.nm),
  },
  {
    id: "sul",
    kicker: "Hoje · extremo sul",
    title: "O sul ainda corre",
    body: `Em Parelheiros e Marsilac, entre represas e mata, ainda há boa parte dos ${fmt(Math.round(KM_OPEN / 100) * 100)} km de água a céu aberto da cidade. É a São Paulo que o asfalto ainda não alcançou.`,
    year: { kind: "word", word: "HOJE" },
    camera: { center: [-46.7, -23.87], zoom: 10.6, pitch: 45, bearing: 0 },
    layers: { terrain: true },
    network: "atual",
  },
  {
    id: "enchente",
    kicker: "Todo verão",
    title: "A água lembra",
    body: "Quando chove forte, a água procura o caminho antigo. A mancha azul mostra onde uma chuva rara, daquelas de 100 anos, alagaria a cidade. Compare com os vales.",
    year: { kind: "word", word: "TODO VERÃO" },
    camera: { center: [-46.65, -23.56], zoom: 11.6, pitch: 30, bearing: 0 },
    layers: { flood: true },
    network: "atual",
  },
  {
    id: "perto",
    kicker: "E aí embaixo?",
    title: "Tem um rio perto de você?",
    body: "A gente procura o rio enterrado mais perto de onde você está.",
    year: { kind: "word", word: "VOCÊ" },
    camera: CITY,
    network: "atual",
    cta: "perto",
  },
  {
    id: "explorar",
    kicker: "Agora é com você",
    title: "Explore o mapa",
    body: "Arraste, aproxime, ligue o relevo e as manchas de enchente. Passe o mouse num rio para saber o nome e a rua que passa por cima.",
    year: { kind: "word", word: "HOJE" },
    camera: CITY,
    network: "atual",
    cta: "explorar",
  },
];

export const STEP_BY_ID: Record<string, StoryStep> = Object.fromEntries(STEPS.map((s) => [s.id, s]));

/** Timeline events told by the steps before `stepId` (plus the step itself once p ≥ 1). */
export function toldBefore(stepId: string): Set<string> {
  const i = STEPS.findIndex((s) => s.id === stepId);
  const told = new Set<string>();
  for (const s of STEPS.slice(0, Math.max(0, i))) {
    if (s.year.kind !== "word" && s.year.eventId) told.add(s.year.eventId);
  }
  return told;
}

/** First year a step shows (for ordering checks); null for word steps. */
export function startYear(step: StoryStep): number | null {
  const y = step.year;
  return y.kind === "word" ? null : y.kind === "point" ? y.year : y.from;
}

export function easeInOutSine(p: number) {
  return -(Math.cos(Math.PI * p) - 1) / 2;
}

/** Year shown for a step at progress p. */
export function yearAt(step: StoryStep, p: number): number | string {
  const y = step.year;
  if (y.kind === "word") return y.word;
  if (y.kind === "point") return y.year;
  // Finish the scrub at 85 % so the outcome holds on screen for the end of the beat.
  const q = Math.max(0, Math.min(1, p / 0.85));
  return Math.round(y.from + (y.to - y.from) * easeInOutSine(q));
}
