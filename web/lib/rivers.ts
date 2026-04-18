export type CursoTipo =
  | "Trecho em estado natural"
  | "Trecho canalizado a céu aberto"
  | "Trecho canalizado subterrâneo"
  | "Trecho em lago ou reservatório";

export type RiverProps = {
  nm_acidente: string | null;
  nm_tipo_curso_hidrografia: CursoTipo | null;
  nm_tipo_trecho: string | null;
  tx_tipo_acidente: string | null;
  qt_comprimento_hidrografia: number | null;
  nm_via_proximo: string | null;
  cd_identificador: number;
};

export type BurialStatus = "natural" | "open" | "buried" | "lake" | "unknown";

export function burialOf(t: string | null | undefined): BurialStatus {
  switch (t) {
    case "Trecho em estado natural":
      return "natural";
    case "Trecho canalizado a céu aberto":
      return "open";
    case "Trecho canalizado subterrâneo":
      return "buried";
    case "Trecho em lago ou reservatório":
      return "lake";
    default:
      return "unknown";
  }
}

export const BURIAL_COLOR: Record<BurialStatus, string> = {
  natural: "#2d8fbb",
  open: "#8bb8d0",
  buried: "#c7506b",
  lake: "#3a9dc7",
  unknown: "#888",
};

export const BURIAL_LABEL_PT: Record<BurialStatus, string> = {
  natural: "Natural, a céu aberto",
  open: "Canalizado a céu aberto",
  buried: "Canalizado subterrâneo (enterrado)",
  lake: "Lago ou reservatório",
  unknown: "Desconhecido",
};

export type Chapter = {
  slug: string;
  title: string;
  subtitle: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  narrative: string;
};

export const CHAPTERS: Chapter[] = [
  {
    slug: "intro",
    title: "Rios Invisíveis",
    subtitle: "São Paulo, a cidade que esqueceu suas águas",
    center: [-46.638, -23.553],
    zoom: 11,
    pitch: 0,
    bearing: 0,
    narrative:
      "Sob as avenidas da maior cidade do hemisfério sul correm mais de 300 rios e córregos. A maioria você não enxerga: foi canalizada, soterrada, transformada em galeria. Este mapa tenta trazê-los de volta à superfície — pelo menos no pixel.",
  },
  {
    slug: "anhangabau",
    title: "Anhangabaú",
    subtitle: "o rio que virou vale",
    center: [-46.639, -23.545],
    zoom: 14.5,
    pitch: 55,
    bearing: -20,
    narrative:
      "O Anhangabaú foi um dos primeiros rios a desaparecer. A partir de 1906 o vale começou a ser aterrado; em 1938 o rio já corria por galerias fechadas. Hoje 'atravessar o Anhangabaú' é descer uma escadaria — mas o rio continua lá, cinco metros abaixo.",
  },
  {
    slug: "tamanduatei",
    title: "Tamanduateí",
    subtitle: "o rio dos bandeirantes",
    center: [-46.615, -23.556],
    zoom: 13.5,
    pitch: 45,
    bearing: 0,
    narrative:
      "Principal rio do centro até o século XIX, o Tamanduateí era onde paulistanos captavam água, lavavam roupa e despejavam esgoto. Retificado a partir de 1911, perdeu as curvas e virou canal reto entre avenidas. A várzea original é hoje o Parque Dom Pedro.",
  },
  {
    slug: "pinheiros",
    title: "Pinheiros",
    subtitle: "de Jeribatiba a canal",
    center: [-46.697, -23.586],
    zoom: 12.5,
    pitch: 50,
    bearing: 25,
    narrative:
      "Batizado pelos indígenas de Jeribatiba ('rio dos jerivás'), o Pinheiros corria em meandros largos pela várzea oeste. A retificação começou em 1928 e se estendeu até os anos 50 — muitas ruas hoje são aterros sobre as antigas curvas, a 500m do canal atual.",
  },
  {
    slug: "tiete",
    title: "Tietê",
    subtitle: "o rio que definiu a cidade",
    center: [-46.695, -23.515],
    zoom: 12,
    pitch: 40,
    bearing: 10,
    narrative:
      "O Tietê nasce em Salesópolis, corre para o interior e foi, por séculos, a porta de saída dos bandeirantes rumo ao oeste. Entre 1937 e os anos 60, o leito foi retificado; as obras mais recentes (2005) estreitaram ainda mais seu caminho. As enchentes de 2024 lembram que ele não esqueceu.",
  },
];

export const SP_CENTER: [number, number] = [-46.638, -23.553];
