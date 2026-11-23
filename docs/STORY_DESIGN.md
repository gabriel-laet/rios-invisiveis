# Rios Invisíveis — Story & Design Spec

Status: proposal, ready to build · Scope: 1–2 days on the existing stack (Next.js 15, MapLibre GL 5, Tailwind 3)
Copy language: PT-BR. Spec language: English.

Facts marked **[VERIFICAR]** must be checked against a source (Prefeitura/GeoSampa, Museu da Cidade, DAEE, Eletropaulo/Light histories, Jorge 2006, Seabra 1987) before publishing. Facts marked **[DADO]** are computed from GeoSampa `drenagem` clipped to the IBGE boundary and must be recomputed by the ETL whenever the data is refreshed — never hard-code them in copy without a build-time source.

---

## 0. The direction in one paragraph

**"Concreto e água, à noite."** The page is São Paulo at night, seen from above, with the city switched off: no streets, no buildings, only water. Living rivers are a cool blue; the **buried rivers glow sodium-lamp amber**, like the street lights of the *avenidas de fundo de vale* that were built on top of them. Typography borrows from the city's concrete-poetry and brutalist tradition (condensed grotesque, all caps, hard edges, no rounded cards). Time is a physical object on screen: a **hidrômetro** (the rolling-digit water meter on every paulistano house) shows the year, and a **régua linimétrica** (the river-gauge ruler painted on bridge pillars) shows where we are between 1554 and today. As you scroll, the odometer only moves forward — after one deliberate rewind — and rivers you just met turn from blue to amber as the years they were buried roll past. The story ends with the reader's own location: *"você está em cima de um rio?"*

---

## 1. Visual identity

### 1.1 Palette

One dark theme. No light mode (this is a night piece; it is also what makes the glow work). Contrast ratios are WCAG 2.x, computed against `asfalto` (page/map bg), `chão` (inside-city land) and `painel` (text panels at full opacity — panels are 90 % opaque, so effective contrast is within ~3 % of these).

| Token | Hex | Use | vs asfalto | vs chão | vs painel |
|---|---|---|---|---|---|
| `asfalto` | `#0E1316` | page bg, map background | — | — | — |
| `chão` | `#141B1F` | municipality fill (land inside SP) | — | — | — |
| `painel` | `#11181C` | story panels (at 90 % + blur), explore panel | — | — | — |
| `breu` | `#07090B` | mask outside the municipality (at 0.92) | — | — | — |
| `garoa` | `#ECE8E1` | primary text, city outline | 15.3 | 14.3 | 14.7 |
| `neblina` | `#A3ADB2` | secondary text, ruler labels, captions | 8.2 | 7.6 | 7.8 |
| `muro` | `#6E7A80` | canal casing, dividers, disabled — **never body text** | 4.2 | 3.9 | 4.1 |
| `memória` | `#3B4A52` | rivers of "unknown state" during the past-tense beats | (line only) | | |
| `rio` | `#4FB8E6` | natural / open-air river (living water) | 8.3 | 7.7 | 8.0 |
| `canal` | `#8FB3C4` | open concrete channel core | 8.4 | 7.8 | 8.0 |
| `lago` | `#2F7FB0` | lakes / reservoirs fill & line | 4.3 | 4.0 | 4.1 |
| `sódio` | `#F5A524` | **buried rivers**, year accent, primary CTA bg | 9.2 | 8.5 | 8.8 |
| `sódio-claro` | `#FFC766` | buried-river core line, focus highlight, kicker text | 12.1 | 11.3 | 11.6 |
| `enchente` | `#3A6BD1` | flood 100-yr fill (fill only, at 0.28) | 3.7 | 3.5 | 3.6 |
| `alerta` | `#FF6B5A` | error/denied states in "Rio perto de mim" only | 6.7 | 6.2 | 6.4 |

Rules:
- Blue = water you can see. Amber = water you can't. Nothing else on the map is saturated.
- Blue/amber is the safest colour-blind pair; buried rivers are *also* dashed, so status never relies on hue alone.
- CTA button: `sódio` background with `asfalto` text (9.2:1).
- Keep the old `BURIAL_COLOR` keys but repoint them to these tokens (see checklist).

### 1.2 Type (Google Fonts via `next/font/google`)

| Role | Family | Settings |
|---|---|---|
| Display: titles, wordmark, odometer digits | **Archivo** (variable, axes `wght` + `wdth`) | titles `wdth 75, wght 800`, UPPERCASE, `letter-spacing: -0.01em`; odometer `wdth 62, wght 800`, `font-variant-numeric: tabular-nums` |
| Body narrative | **Newsreader** (variable, `opsz`) | 400, 19px/1.5 desktop, 17px/1.5 mobile; italics for street names and Tupi names |
| Data, kickers, ruler, legend, tooltips | **IBM Plex Mono** | 400/500, 11–13px, UPPERCASE kickers with `letter-spacing: 0.12em` |

Map labels rendered by MapLibre stay on `Noto Sans Regular` glyphs (we don't host PBF glyphs for our fonts). Every label that matters in the story is a **DOM callout** (Archivo/Plex Mono), not a symbol layer — see §3.4.

Wordmark: `RIOS INVISÍVEIS` in Archivo 75/800, with a 2px dashed `sódio` underline under `INVISÍVEIS` (a buried river under the word).

Texture: panels get a 4 % SVG-noise overlay ("garoa") via a CSS background-image data URI. Corner radius 2px everywhere (brutalist, no pills except the mobile peek handle).

### 1.3 Tone of voice

Second person, present tense, short sentences, street-level specificity (name the avenue, not "an avenue"), dry paulistano humour, no melodrama, no "esquecidos" every other line. Numbers are concrete and comparable. When we don't know, we say so — out loud, in the copy.

Sample rewrites:

- Old: "Sob as avenidas da maior cidade do hemisfério sul correm mais de 300 rios e córregos."
  New: **"Você atravessa um rio quase todo dia. Só não molha o pé."**
- Old: "Hoje 'atravessar o Anhangabaú' é descer uma escadaria — mas o rio continua lá."
  New: **"Hoje, atravessar o Anhangabaú é descer uma escada. O rio continua lá embaixo, sem pressa."**
- New (Plano de Avenidas): **"A ideia era simples: o fundo do vale é o lugar perfeito para uma avenida. O córrego que se mude."**
- New (honesty note): **"Não sabemos o ano de cada trecho enterrado. Sabemos o resultado."**

### 1.4 Map styling — the rivers-only view

Data (from the ETL): `/data/limite_sp.geojson` (municipality polygon) and `/data/rios_sp.geojson` (27,869 segments: 19,919 `n`, 4,492 `b`, 2,363 `l`, 1,095 `o`) with compact props `t ∈ {n, o, b, l}` (natural, open channel, buried, lake), `nm` (optional, on ~5.7k segments), `via` (nearest street, optional).

> **Name format (checked in the file as shipped):** `nm` is *Title Case with partial accents* — `"Córrego Itororo"`, `"Rio Tiete"`, `"Rio Tamanduatei"`, `"Córrego Anhangabau"` — not UPPERCASE. `via` is Title Case with bare abbreviations — `"Av Vinte e Tres de Maio"`. Every `match`/`focus` list in this spec uses the exact strings found in `rios_sp.geojson`. If the ETL changes casing, update the lists, or add a normalised key at load (NFD-strip accents + uppercase) and match on that. Existing `mancha_inundacao_100`, `bacia_hidrografica`, `massa_d_agua` are reused.

No raster basemap by default. Layer stack, bottom → top (ids are normative; the checklist references them):

| # | id | type / source | paint (exact) | story | explore |
|---|---|---|---|---|---|
| 1 | `bg` | background | `background-color: #0E1316` | on | on |
| 2 | `basemap` | raster (existing source) | satellite only: `raster-saturation -0.8`, `raster-brightness-max 0.55`, `raster-opacity 0.6` | off | if "Satélite" |
| 3 | `land` | fill · `limite` | `fill-color #141B1F` | on | on |
| 4 | `hillshade` | hillshade · `hillshade` | `shadow rgba(0,0,0,0.55)`, `highlight rgba(236,232,225,0.07)`, `accent #0E1316`, `exaggeration 0.3` | on | toggle (default on) |
| 5 | `streets` | line · `ofm` vector, `source-layer: transportation`, filter `class ∈ [motorway, trunk, primary]` | `line-color #ECE8E1`; `line-opacity` interp z11 0 → z12 0.06 → z15 0.14; `line-width` z11 0.4 → z15 1.2 | per-beat | toggle "Ruas" (default off) |
| 6 | `flood-100` | fill · `flood100` | `fill-color #3A6BD1`, `fill-opacity 0.28`, no outline | per-beat | toggle |
| 7 | `basins` | line · `basins` | `#A3ADB2`, opacity 0.25, width 0.8, dash `[4,3]` | off | toggle |
| 8 | `water-fill` | fill · `water` | `fill-color #2F7FB0`, `fill-opacity 0.55`, `fill-outline-color #4FB8E6` | on | on |
| 9 | `net-passado` | line · `rios`, all segments not in curated set | `line-color` = `#4FB8E6` if year < 1900 else `#3B4A52` (set by code); width z9 0.4 → z12 0.8 → z15 1.6; opacity 0.7 | past beats | off |
| 10 | `net-canal-casing` | line · `rios`, `t == "o"` | `#6E7A80`; width z9 1.4 → z12 2.4 → z15 5 → z17 9; opacity 0.9 | present beats | on |
| 11 | `net-canal` | line · `rios`, `t == "o"` | `#8FB3C4`; width z9 0.6 → z12 1.1 → z15 2.4 → z17 4.5 | present | on |
| 12 | `net-vivo-glow` | line · `rios`, `t in [n,l]` | `#4FB8E6`; width z9 2 → z15 8; `line-blur` 3; opacity 0.18 | present | on |
| 13 | `net-vivo` | line · `rios`, `t in [n,l]` | `t==l ? #2F7FB0 : #4FB8E6`; width z9 0.6 → z12 1.2 → z15 2.5 → z17 5 | present | on |
| 14 | `net-enterrado-glow` | line · `rios`, `t == "b"` | `#F5A524`; width z9 2 → z12 5 → z15 12 → z17 22; `line-blur` z9 2 → z15 8; opacity **0.22** (0.45 when a beat sets `glow: "forte"`) | present | on |
| 15 | `net-enterrado` | line · `rios`, `t == "b"` | `#FFC766`; width z9 0.5 → z12 1 → z15 2 → z17 3.5; `line-dasharray [2, 1.5]`; opacity 0.95 | present | on |
| 16 | `cur-vivo` / `cur-obra` / `cur-final-*` | line · `rios`, filter `nm in <curated names>` split by computed state (§3) | vivo = like `net-vivo` ×1.6 width; obra = `#ECE8E1` dashed `[1,1]` animated; final = same paint as 10–15 | past beats | off |
| 17 | `foco-glow` / `foco` | line · `rios`, filter `nm in step.focus` | glow `#FFC766` width ×2.2 of base, blur 6, opacity 0.5; core keeps its status colour at width ×1.8 | per-beat | "Rio perto de mim" |
| 18 | `mask` | fill · `mask` (world minus city, built in code) | `fill-color #07090B`, `fill-opacity 0.92` | on | on (0.85) |
| 19 | `outline-glow` | line · `limite` | `#ECE8E1`, width 8, blur 8, opacity 0.06 | on | on |
| 20 | `outline` | line · `limite` | `#ECE8E1`, width z9 1.2 → z14 2, opacity 0.55 | on | on |
| 21 | `perto-*` | "Rio perto de mim" layers (§5) | | end | on demand |

Dimming: whenever a step has `focus`, layers 9–15 animate `line-opacity` to 35 % of their value (`*-opacity-transition: { duration: 600 }`). Never hide the network — the reader should always see the city's shape.

Mask: built client-side once `limite_sp.geojson` loads:

```ts
// lib/mask.ts
export function worldMinus(city: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.Feature<GeoJSON.Polygon> {
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const holes = city.type === "Polygon" ? [city.coordinates[0]] : city.coordinates.map((p) => p[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } };
}
```

Street hints source: OpenFreeMap vector tiles (keyless, OpenMapTiles schema): `{ type: "vector", url: "https://tiles.openfreemap.org/planet" }` **[VERIFICAR URL before shipping]**. If unavailable, drop layer 5 entirely — streets are a nice-to-have; the `via` attribute already provides street names in callouts and tooltips. Street-name *labels* are never symbol layers; they're DOM callouts from `via`.

GeoJSON source for `rios`: `tolerance: 0.6`, `generateId: true`, `buffer: 64`.

Terrain: Terrarium DEM (existing), off for the first three beats (fast first paint), on from beat 3 onward, existing zoom-dependent exaggeration kept.

---

## 2. Narrative structure

Rule: **after the rewind (beat 2), the year never goes backwards.** Beats are ordered by the start year of their event, not by geography. Every beat shows a year or a range.

Camera notation: `center [lon, lat] · zoom · pitch · bearing`. `fit:` means `fitBounds` over the matching features (computed at load). Desktop camera padding `{ left: 480 }` (text column); mobile `{ top: 64, bottom: 0.45·innerHeight }` and zoom −0.6 unless noted.

"Network" = how the 27k segments are drawn: `atual` (layers 10–15, real status), `passado` (layer 9 + curated layers 16 driven by the year), `regra` (cross-fade passado → atual with scroll progress).

### B0 · `capa` — HOJE
- Purpose: hook + show in 5 s that this is São Paulo, only water.
- Kicker: `SÃO PAULO · HOJE`
- Title: `RIOS INVISÍVEIS`
- Body: "São Paulo tem cerca de 5 mil quilômetros de rios e córregos. Você atravessa vários todos os dias — por cima." **[DADO: ~5.000 km]**
- Cue: `↓ role devagar`
- Camera: `fit: município`, pitch 0, bearing 0 (desktop padding left 480).
- Layers: land, hillshade, water, network `atual`, mask, outline. Terrain off.
- Highlight: none. Glow normal.

### B1 · `chave` — HOJE
- Purpose: teach the visual grammar using the real numbers.
- Kicker: `HOJE`
- Title: `TIRAMOS A CIDADE`
- Body: "Sem ruas, sem prédios, sem trânsito. Sobrou a água, dentro do limite do município. Em azul, o rio que ainda vê o céu. Em âmbar, o que corre sob o asfalto: 1.364 km." **[DADO]**
- Inline legend inside the panel (3 swatches: azul / concreto / âmbar tracejado).
- Camera: `[-46.640, -23.570] · 11.2 · 0 · 0`.
- Layers: as B0. `glow: "forte"` on buried.

### B2 · `rebobinar` — 2026 → 1554 (scrubbed)
- Purpose: the one deliberate rewind; establishes the odometer as the time machine.
- Kicker: `REBOBINANDO`
- Title: `VOLTE NO TEMPO`
- Body: "Gire o hidrômetro para trás. Antes do asfalto, antes do bonde, antes da cidade: toda essa água corria a céu aberto."
- Note (small, Plex Mono, `neblina`): "Os traçados são os de hoje. O desenho original, mais sinuoso, se perdeu com as obras."
- Camera: static at B1 framing; zoom eases 11.2 → 11.6 with progress.
- Network: cross-fade `atual` → `passado` as the year passes 1900 going backwards; at 1554 everything is `rio` blue.
- Year: scrubbed `2026 → 1554` linearly with scroll progress; odometer rolls backwards (only time it does).

### B3 · `piratininga` — 1554
- Purpose: origin — the city chose its hill because of these two rivers.
- Kicker: `1554`
- Title: `ENTRE DOIS RIOS`
- Body: "A vila nasce no alto de uma colina, entre o Anhangabaú, a oeste, e o Tamanduateí, a leste. Água era defesa, caminho e abastecimento."
- Camera: `[-46.6334, -23.5479] · 14.6 · 60 · -30` (Pátio do Colégio).
- Layers: terrain ON, hillshade, network `passado`.
- Highlight: `focus: ["Córrego Anhangabau", "Rio Tamanduatei"]`.
- Callouts: "Pátio do Colégio" at `[-46.6334, -23.5479]`; river names on each river.

### B4 · `anhangabau` — 1906 → 1938
- Purpose: first burial, watched happening.
- Kicker: `1906 — 1938` **[VERIFICAR both years]**
- Title: `O RIO QUE VIROU VALE`
- Body: "A partir de 1906, o vale começa a ser aterrado. Em 1938, o Anhangabaú já corre em galeria. Hoje, atravessar o Anhangabaú é descer uma escada. O rio continua lá embaixo, sem pressa."
- Camera: `[-46.639, -23.545] · 14.5 · 55 · -20` (from rivers.ts).
- Network: `passado`; Anhangabaú goes vivo → obra (1906–1938) → final (today's `t`: 2 buried + 1 open segment) as the year scrubs.
- Highlight: `focus: ["Córrego Anhangabau"]`.
- Callout: "Vale do Anhangabaú" + sub "sob a Av. 23 de Maio e a Av. do Estado" (from `via`).

### B5 · `tamanduatei` — 1911 → anos 1920
- Purpose: rectification ≠ burial; the floodplain becomes a park.
- Kicker: `A PARTIR DE 1911` **[VERIFICAR start year and end; the Várzea do Carmo → Parque D. Pedro II works are usually dated to the 1910s–1920s]**
- Title: `O RIO EM LINHA RETA`
- Body: "Era o rio do centro: água, roupa lavada, esgoto. A partir de 1911, perde as curvas e vira canal entre avenidas. A várzea do Carmo vira o Parque Dom Pedro II."
- Camera: `[-46.625, -23.552] · 13.6 · 45 · 0` (shifted west from rivers.ts to include Parque D. Pedro II).
- Layers: `flood-100` ON (the floodplain the river still remembers), terrain.
- Highlight: `focus: ["Rio Tamanduatei"]`; Tamanduateí scrubs vivo → obra → final (21 open / 11 buried segments in `rios_sp`).

### B6 · `pinheiros` — 1928 → anos 1950
- Purpose: a river re-engineered for electricity; meanders → straight canal; flow reversed.
- Kicker: `1928 — ANOS 1950` **[VERIFICAR]**
- Title: `DE JURUBATUBA A CANAL`
- Body: "Os indígenas o chamavam de *Jurubatuba*. A partir de 1928, a Light retifica o Pinheiros para gerar energia — e chega a inverter o sentido da água. A várzea vira loteamento. A enchente, não."
  **[VERIFICAR: Tupi name — rivers.ts says "Jeribatiba"; "Jurubatuba" is the more common spelling; pick one with a source. VERIFICAR the reversal decade (bombeamento para a Billings, anos 1940).]**
- Camera: `[-46.697, -23.586] · 12.5 · 50 · 25` (from rivers.ts).
- Layers: `flood-100` ON, terrain.
- Highlight: `focus: ["Rio Pinheiros"]`. Pinheiros scrubs vivo → obra → final (open channel, concrete casing).

### B7 · `avenidas` — 1930 → anos 1970
- Purpose: the method — avenues on valley floors buried the tributaries.
- Kicker: `1930 · PLANO DE AVENIDAS` (1930 plan by Prestes Maia: firm) / range of burials **[VERIFICAR each córrego's burial years]**
- Title: `O VALE VIRA AVENIDA`
- Body: "Em 1930, o Plano de Avenidas de Prestes Maia propõe uma ideia simples: o fundo do vale é o lugar perfeito para uma avenida. O córrego que se mude. O Saracura vira a Nove de Julho. O Itororó, a 23 de Maio."
- Camera: `[-46.648, -23.547] · 13.6 · 40 · -15` (bounds of Saracura + Itororó + Pacaembu + Anhangabaú: `[-46.6674, -23.574, -46.6276, -23.5203]`).
- Layers: `streets` ON (the only beat besides the finale), network `passado`.
- Highlight: `focus: ["Córrego Saracura", "Córrego Itororo", "Córrego Pacaembu"]`; each scrubs to buried.
- Callouts (from `via`, confirmed in data): Saracura → "Av. Nove de Julho", Itororó → "Av. 23 de Maio", Pacaembu → "Pça. Charles Miller".

### B8 · `tiete` — 1937 → anos 1960
- Purpose: the river that defined the city, straightened; upstream, in the east, it still runs natural.
- Kicker: `1937 — ANOS 1960` **[VERIFICAR]**
- Title: `O RIO QUE DEFINIU A CIDADE`
- Body: "Por séculos foi a porta de saída para o interior. A partir de 1937, o Tietê é retificado e espremido entre as marginais. Mas siga o rio para o leste: perto da divisa, ele ainda corre em estado natural."
- Note: "Obras de rebaixamento da calha nos anos 2000 mexeram de novo no leito." **[VERIFICAR dates; the old copy's "estreitaram em 2005" is unsourced — drop unless confirmed]**
- Data check: `"Rio Tiete"` has 42 `o` segments (the canal, west/centre) and 38 `n` segments, all between lon −46.50 and −46.40 (east zone, upstream). `"Braco Tiete"` (8 `n`, 2 `b`, 1 `o`) is at lon −46.55…−46.52 — also east. **[VERIFICAR what "Braco Tiete" is (likely remnant of the old course near the Parque Ecológico do Tietê); don't call it an oxbow without a source]**
- Camera, two-part: on enter `[-46.690, -23.515] · 12 · 40 · 10` (from rivers.ts: canal + Marginal); at progress ≥ 0.5 `easeTo [-46.560, -23.500] · 11.2 · 35 · 0` (pan east along the river to the natural stretch).
- Layers: `flood-100` ON, terrain.
- Highlight: `focus: ["Rio Tiete", "Braco Tiete"]`. Callout on the east stretch: "Tietê" + "ainda em estado natural".

### B9 · `regra` — 1940 → 2000 (era band)
- Purpose: honest transition from curated history to the whole network.
- Kicker: `1940 — 2000`
- Title: `DEPOIS, VIROU REGRA`
- Body: "Ninguém precisou de outro plano. Córrego virou galeria, galeria virou rua, rua virou endereço. Não sabemos o ano de cada trecho enterrado. Sabemos o resultado."
- Camera: `[-46.640, -23.570] · 11.2 · 0 · 0`.
- Network: `regra` — uniform cross-fade from `passado` (grey) to `atual` driven by scroll progress. **No spatial or ordered wipe** (it would imply dates we don't have).
- Year: odometer scrubs 1940 → 2000; the régua shows a hatched band, not a point.

### B10 · `hoje` — HOJE
- Purpose: the reveal, in numbers.
- Kicker: `HOJE`
- Big stat (Archivo 96px, `sódio`): `1.364 km` · label "de rios correm sob São Paulo" **[DADO]**
- Body: "Mais que a distância de São Paulo a Brasília pela estrada. Os mais longos: o córrego da Mooca (~10 km), o do Cordeiro (~7,9 km) e o Pirajuçara (~6,8 km)." **[DADO for lengths; VERIFICAR the SP–Brasília comparison, ~1.000 km by road]**
- Camera: `fit: município`, pitch 0.
- Network `atual`, `glow: "forte"`.
- Highlight: `focus: ["Córrego da Mooca", "Córrego do Cordeiro", "Córrego Pirajucara"]`.

### B11 · `sul` — HOJE
- Purpose: a breath of hope; the far south still runs free.
- Kicker: `HOJE · EXTREMO SUL`
- Title: `O SUL AINDA CORRE`
- Body: "Em Parelheiros e Marsilac, entre represas e mata, ainda há mais de 3 mil quilômetros de água a céu aberto. É a São Paulo que a cidade ainda não alcançou." **[DADO: 3.088 km natural/open mostly in the far south — check that "mostly" holds before saying "lá"]**
- Camera: `[-46.700, -23.870] · 10.6 · 45 · 0` **[VERIFICAR framing in app]**.
- Network `atual`. No focus (the whole blue fan is the subject).

### B12 · `enchente` — TODO VERÃO
- Purpose: consequence — water remembers its valleys.
- Kicker: `TODO VERÃO`
- Title: `A ÁGUA LEMBRA`
- Body: "Quando chove forte, a água procura o caminho antigo. A mancha azul mostra onde uma chuva rara, daquelas de 100 anos, alagaria a cidade. Compare com os vales."
- Camera: `[-46.650, -23.560] · 11.6 · 30 · 0`.
- Layers: `flood-100` ON over the whole city, network `atual`.
- Year device: odometer shows `TODO VERÃO` (text mode).

### B13 · `perto` — VOCÊ
- Purpose: the payoff — make it personal. See §5 "Rio perto de mim".
- Kicker: `E AÍ EMBAIXO?`
- Title: `TEM UM RIO PERTO DE VOCÊ?`
- Body: "A gente procura o rio enterrado mais perto de onde você está."
- Primary button: `Encontrar o rio mais perto de mim`. Secondary link: `ou escolha um ponto no mapa`.
- Privacy line: "Sua localização fica só no seu navegador. Nada é enviado a servidor nenhum."
- Camera: `fit: município`.

### B14 · `explorar` — HOJE (handoff)
- Kicker: `AGORA É COM VOCÊ`
- Title: `EXPLORE O MAPA`
- Body: "Arraste, aproxime, ligue o relevo e as manchas de enchente. Passe o mouse num rio para saber o nome e a rua que passa por cima."
- Primary button: `Explorar o mapa →`. Scrolling past the end also enters explore (see §4.3).

---

## 3. The year-by-year device

### 3.1 Hidrômetro (odometer)

- A rolling-digit counter styled after a residential water meter: 4 digit windows (Archivo `wdth 62, wght 800`), digits `garoa` on `#0A0E10` windows with 1px `muro` border; the **last digit window is `sódio`** (like the red dial on a real meter).
- Text mode for non-numeric years (`HOJE`, `TODO VERÃO`, `VOCÊ`): the digits slide out and the word slides in, same box.
- Prefix `c.` (Plex Mono, small, above the digits) whenever the current year falls inside an event whose certainty is not `firme`.
- Under the digits: era label in Plex Mono (e.g. `ANHANGABAÚ · ATERRO`), from the active event.
- Rolling: per-digit `translateY` with 180 ms ease-out; with reduced motion, digits swap instantly.
- `aria-live="polite"` on a visually-hidden sibling that announces only on **step change** ("Ano: 1906 a 1938"), never during scrubbing.

### 3.2 Régua (ruler)

- Desktop: vertical, fixed on the right edge, 60vh tall, 40px wide, styled as a river-gauge staff (alternating `garoa`/transparent 10-year ticks, labels every century in Plex Mono 11px `neblina`).
- **Piecewise scale**: 1554–1900 → top 20 % of the ruler (with a `≈` break glyph at 1900); 1900–2026 → remaining 80 %. Otherwise the 20th century, where everything happens, would be a sliver.
- Event bands: 3px `sódio` bars beside the staff at each `TimelineEvent` range; uncertain ends fade out (linear-gradient to transparent over the last 15 % of the bar). The era band `regra` is hatched.
- Water-level marker: a horizontal `rio`-blue line that moves to the current year — the "water level" of time.
- Mobile: horizontal, 4px tall strip under the odometer bar, no labels except the current year; event bands as amber segments.

### 3.3 Burying rivers as the years pass

For curated rivers only (named in `TIMELINE`), state at year *Y*:

```
Y < from          → "vivo"   (blue, solid, ×1.6 width)
from ≤ Y < to     → "obra"   (garoa, dashed [1,1], dash offset animated 1.2 s loop)
Y ≥ to            → "final"  (each segment drawn with its REAL t from GeoSampa today)
```

The final state is always today's data, so we never claim a segment is buried when GeoSampa says it's open. Non-curated segments are `vivo` (blue) for Y < 1900, `memória` grey for Y ≥ 1900 during past-tense beats (state unknown), and switch to real status only in B9 (`regra`).

MapLibre implementation: `line-dasharray` is not data-driven, so states are separate layers whose **filters** are rebuilt when the integer year changes (at most ~20 times per beat). Cheap; no per-frame repaint.

```ts
// lib/timeline.ts
export type Certainty = "firme" | "aproximado" | "verificar";
export type EventKind = "marco" | "retificacao" | "enterramento" | "era";

export type TimelineEvent = {
  id: string;
  from: number;
  to?: number;              // end of works; required for retificacao/enterramento
  label: string;            // what the kicker/régua shows, e.g. "1928 — anos 1950"
  title: string;            // short PT-BR, for régua tooltip and era label
  kind: EventKind;
  match: string[];          // exact `nm` values in rios_sp.geojson ("*" = all non-curated)
  path?: string;            // optional id in /data/curated/tracados.geojson (hand-traced from SARA 1930)
  certainty: Certainty;
  source?: string;          // citation, required before publishing
  note?: string;
};

export const TIMELINE: TimelineEvent[] = [
  { id: "fundacao", from: 1554, label: "1554", title: "Fundação entre dois rios", kind: "marco",
    match: ["Córrego Anhangabau", "Rio Tamanduatei"], certainty: "firme" },
  { id: "anhangabau", from: 1906, to: 1938, label: "1906 — 1938", title: "Anhangabaú · aterro e galeria",
    kind: "enterramento", match: ["Córrego Anhangabau"], certainty: "verificar",
    note: "Datas herdadas do texto original (rivers.ts). Confirmar início do aterro e conclusão das galerias." },
  { id: "tamanduatei", from: 1911, to: 1925, label: "a partir de 1911", title: "Tamanduateí · retificação",
    kind: "retificacao", match: ["Rio Tamanduatei"], certainty: "verificar",
    note: "Fim (1925) é marcador de animação, não fato. Confirmar faixa real." },
  { id: "pinheiros", from: 1928, to: 1955, label: "1928 — anos 1950", title: "Pinheiros · retificação (Light)",
    kind: "retificacao", match: ["Rio Pinheiros"], certainty: "aproximado" },
  { id: "sara", from: 1930, label: "1930", title: "Levantamento SARA Brasil", kind: "marco", match: [], certainty: "firme" },
  { id: "plano-avenidas", from: 1930, label: "1930", title: "Plano de Avenidas (Prestes Maia)", kind: "marco",
    match: [], certainty: "firme" },
  { id: "vales-avenidas", from: 1930, to: 1970, label: "anos 1930 — 1970", title: "Saracura, Itororó, Pacaembu sob avenidas",
    kind: "enterramento", match: ["Córrego Saracura", "Córrego Itororo", "Córrego Pacaembu"], certainty: "verificar",
    note: "Associação rio→avenida confirmada pelo campo `via` do GeoSampa; anos de cada canalização a verificar." },
  { id: "tiete", from: 1937, to: 1965, label: "1937 — anos 1960", title: "Tietê · retificação",
    kind: "retificacao", match: ["Rio Tiete"], certainty: "aproximado" },
  { id: "regra", from: 1940, to: 2000, label: "1940 — 2000", title: "Enterrar vira regra", kind: "era",
    match: ["*"], certainty: "aproximado", note: "Faixa ilustrativa; não há data por trecho." },
];

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
  "Riacho do Ipiranga": "riacho do Ipiranga",
};
// Fallback: lowercase the generic word ("Córrego"/"Rio"/"Ribeirão"/"Riacho") → "córrego Xyz"; null → "um córrego sem nome".
// `via` formatting (input "Av Vinte e Tres de Maio", "R Seresta do Amor"): first token
// Av→Av., R→R., Pc→Pça., Al→Al., Est→Estr., Tv→Tv., Vd→Viad.; keep the rest. Small override map for
// the story's avenues: { "Av Vinte e Tres de Maio": "Av. 23 de Maio", "Av Nove de Julho": "Av. 9 de Julho" }.
```

Also **[VERIFICAR]** and only add if sourced: the reversal of the Pinheiros (anos 1940), "Nova Marginal" works on the Tietê (c. 2009–2010), rebaixamento da calha (c. 2000s). They can go into notes, not into the animation.

Hand-drawn paths (`path`): optional phase-2 file `/data/curated/tracados.geojson` with the 1930 meanders of Pinheiros/Tietê traced from SARA 1930 in QGIS. Until it exists, B5/B6/B8 use the 100-yr flood polygon as the honest proxy for "the old floodplain", and the copy says so.

### 3.4 Callouts (DOM labels)

`maplibregl.Marker` with a custom element: river name in Archivo 75/700 14px `garoa`, sub-line (street) in Newsreader italic 14px `neblina`, a 1px `garoa` leader line 24px long. Position: per-step `lngLat` (hand-picked) or the midpoint of the longest segment of a `focus` name (computed). Fade in 300 ms after `moveend`. Hidden below 380px width if they collide with the panel (only first callout shown on mobile).

---

## 4. Layout

### 4.1 Desktop (≥ 768px)

```
STORY MODE
┌─────────────────────────────────────────────────────────────────────────────┐
│ RIOS INVISÍVEIS (wordmark, 16px)                         ┌────────────┐     │
│                                                          │ c.         │     │
│ ┌──────────────────────┐                                 │ 1 9 2 [8]  │ ┬   │
│ │ 1928 — ANOS 1950     │   (map: fixed, full-bleed,      │ PINHEIROS  │ │ ← régua
│ │ DE JURUBATUBA        │    non-interactive, dark,       └────────────┘ ┼   │   (fixed,
│ │ A CANAL              │    masked to the city)                         │   │   60vh)
│ │                      │                                                ━   │ ← water level
│ │ Os indígenas o       │        ~~ Pinheiros (callout)                  │   │
│ │ chamavam de...       │                                                ┴   │
│ └──────────────────────┘                                                    │
│  ↑ panel: 400px, left 6vw, scrolls with the document                        │
│ ▪ azul  ▬ canal  ┅ âmbar  (chave, 11px)         [Pular para o mapa →]       │
└─────────────────────────────────────────────────────────────────────────────┘

EXPLORE MODE
┌─────────────────────────────────────────────────────────────────────────────┐
│ RIOS INVISÍVEIS   [↺ Voltar à história] [⌖ Rio perto de mim]   ┌──────────┐ │
│                                                                │ CAMADAS  │ │
│                                                                │ Base: Só água│
│          (map: interactive — drag, zoom, rotate, pitch)        │  Ruas / Satélite│
│                                                                │ ☐ Relevo 3D│ │
│                   ┌─────────────────┐                          │ ☑ Sombra │ │
│                   │ CÓRREGO SARACURA│  ← hover tooltip          │ ☐ Enchente│ │
│                   │ Enterrado       │                          │ ☐ Bacias │ │
│                   │ sob a Av. Nove… │                          │ ☐ SARA 1930│
│                   └─────────────────┘                          └──────────┘ │
│ ┌ LEGENDA ─────────────┐                              [+][-][⊙]  escala     │
│ │ ━ rio a céu aberto   │                                                    │
│ │ ━ canal de concreto  │                                                    │
│ │ ┅ rio enterrado      │                                                    │
│ │ ▒ mancha 100 anos    │                                                    │
│ └ fonte: GeoSampa ─────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mobile (≤ 420px)

```
STORY                               EXPLORE
┌───────────────────────┐          ┌───────────────────────┐
│ c.1928 ▮▮▮▮▮━━──── ≡  │ 48px     │ [↺ História]  [⌖]     │
│ PINHEIROS             │ odometer │                       │
│                       │ + régua  │      (map, full,      │
│   (map, top ~55 %,    │ strip    │       interactive)    │
│    subject framed     │          │                       │
│    via camera padding)│          │                       │
│                       │          │                       │
│┌─────────────────────┐│          │┌─────────────────────┐│
││1928 — ANOS 1950     ││          ││ ▔▔ Camadas · Legenda ││ ← bottom sheet,
││DE JURUBATUBA A CANAL││ ← panel  │└─────────────────────┘│   peek 56px,
││Os indígenas o...    ││   16px   └───────────────────────┘   expands to 60vh
│└─────────────────────┘│   gutters
└───────────────────────┘
```

- Story panels are full width minus 16px gutters, enter from the bottom, max-height 45vh; the camera padding keeps the subject in the upper half.
- Legend on mobile story: a `?` chip in the top bar that toggles a 3-line key; on B1 the key is inside the panel anyway.
- Hover tooltips become tap tooltips (tap a river → bottom card); no hover on touch.
- No horizontal scroll; panel text 17px.

### 4.3 Modes, z-order, visibility

| z | element | story | explore |
|---|---|---|---|
| 0 | map (`position: fixed; inset: 0`) | `pointer-events: none`; all handlers disabled; canvas `aria-hidden` | `pointer-events: auto`; handlers enabled |
| 10 | DOM callouts | per-step | only "Rio perto de mim" result |
| 20 | story article (document flow) | visible, scrolls the page | `display: none` (story scroll position saved) |
| 30 | odometer + régua | visible | hidden (phase 3: becomes a "linha do tempo" scrubber, see §8) |
| 30 | chave (mini legend) | visible | replaced by full legend |
| 30 | explore top bar, layer panel, legend | hidden | visible |
| 40 | tooltip / result card | — | visible |
| 50 | skip link, focus rings | always | always |

Mode switch:
- **Story → explore**: CTA in B14, "Pular para o mapa" link, B13 result, or scrolling past the sentinel after B14 (an `IntersectionObserver` on a 1px sentinel 40vh below the last panel). Entering explore: save `scrollY`, set `body { overflow: hidden }`, hide article, enable map handlers (`scrollZoom`, `dragPan`, `dragRotate`, `keyboard`, `doubleClickZoom`, `touchZoomRotate`, `touchPitch`, `boxZoom`), set network to `atual`, remove focus/dimming, keep the current camera. Push `#explorar` to history.
- **Explore → story**: "↺ Voltar à história" button or browser Back. Disable handlers, show article, restore to the **top of B14** (not the very start), fly camera to B14's camera. Users can scroll up from there.
- Deep link: `/#explorar` opens directly in explore at the full-city view.

Map handlers are disabled with the handler APIs, not by recreating the map (`interactive` can't be toggled after construction).

---

## 5. "Rio perto de mim"

### 5.1 Where it lives
- **Story B13** — the payoff beat, with the primary button. Getting a result automatically enters explore mode (the reader now has their own river on screen and will want to pan).
- **Explore top bar** — always-available button `⌖ Rio perto de mim`, which opens a small popover with two options: "Usar minha localização" and "Escolher um ponto no mapa".

### 5.2 Flow
1. Button → `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 })`.
2. Denied / unavailable / timeout → **pick mode**: cursor crosshair, top banner "Toque em um ponto do mapa", next map click is the point. Esc cancels.
3. Point-in-polygon against `limite_sp` (ray casting, client-side). Outside → outside message, stay in pick mode.
4. Nearest search, entirely client-side, over the already-loaded `rios_sp` data:
   - Build once (lazily, on first use) a 500 m grid index of segments in a local equirectangular projection (`x = (lon − λ0)·cos φ0·111 320`, `y = (lat − φ0)·110 540`, origin at the city centroid).
   - Query the 3×3 neighbouring cells, expand rings until a candidate is found; compute exact point-to-segment distance.
   - Return two results: nearest with `t == "b"` (buried) and nearest of any status.
5. Fly + reveal (§5.4) and show the result card.

No network requests. Coordinates never leave the page unless the user presses "Compartilhar".

### 5.3 Copy (PT-BR)

Name formatting: `NAME_PT[nm]` → else title-case (`córrego Xyz`) → else `um córrego sem nome`. Street: formatted `via` → else omit the street clause. Distances rounded: < 100 m to 5 m, else to 10 m; ≥ 1 km as `1,2 km`.

| Case | Headline (Archivo) | Body (Newsreader) |
|---|---|---|
| Over (< 30 m from buried) | `VOCÊ ESTÁ EM CIMA DE UM RIO.` | "O {nome} corre aqui embaixo, sob a {via}. Está a uns {d} metros dos seus pés — no escuro, mas correndo." |
| Near (30–300 m) | `TEM UM RIO A {d} METROS.` | "O rio enterrado mais perto de você é o {nome}. Ele passa sob a {via}. Dá pra ir a pé." |
| Far (> 300 m) | `O RIO ENTERRADO MAIS PERTO FICA A {d}.` | "É o {nome}, sob a {via}." + if a visible river is closer: "Mas o {nome2}, a {d2}, ainda corre a céu aberto. Vale a visita." |
| Outside SP | `FORA DO MAPA.` | "Esse ponto fica fora da cidade de São Paulo, e este mapa só conhece os rios da capital. Toque em um ponto dentro do contorno." |
| Permission denied / no geolocation | `SEM PROBLEMA.` | "Toque em qualquer ponto do mapa — sua casa, seu trabalho, aquela esquina que sempre alaga — e a gente procura o rio." |
| Low accuracy (> 100 m) | (suffix line) | "Sua localização tem precisão de ±{acc} m. O resultado pode variar um pouco." |

Always shown under the button and in the card footer (Plex Mono 11px, `neblina`):
"Sua localização fica só no seu navegador. Nada é enviado a servidor nenhum."

Card actions: `Ver o rio inteiro` (fit bounds of all segments with that `nm`), `Compartilhar`, `Tentar outro ponto`.

### 5.4 Map treatment
- Camera: `fitBounds([userPoint, nearestPoint])` with `maxZoom 17`, `minZoom 15`, pitch 50, bearing unchanged, terrain on, duration 2400 (instant with reduced motion).
- `perto-ponto`: circle at the user point, `circle-color #ECE8E1`, radius 5, stroke 2 `#0E1316`; plus a pulsing ring (DOM marker, CSS `scale 1→3, opacity 0.6→0`, 1.6 s loop; static ring with reduced motion).
- `perto-prumo`: a "plumb line" from the user point to the nearest point on the river — line `#ECE8E1`, width 1.5, dasharray `[1, 2]`, with a DOM label at its midpoint: `{d} m`.
- River highlight: all segments with the same `nm` (or just the matched segment if unnamed) go into `foco-glow`/`foco` (§1.4 #17); the rest of the network dims to 35 %.
- Callout on the river: name + "sob a {via}".

### 5.5 Share (cheap, opt-in)
- `Compartilhar` builds `/?ponto=-23.561,-46.656` — **rounded to 3 decimals (~100 m)** — and calls `navigator.share` or copies to the clipboard. Text: "Tem um rio embaixo de {via}: o {nome}. Veja no mapa."
- The button label says what is shared: `Compartilhar (o link inclui o ponto, arredondado para ~100 m)`.
- Opening a `?ponto=` link goes straight to explore mode and runs the same search on that point; the card headline switches to the third person: `TEM UM RIO AQUI EMBAIXO.`
- Never write `?ponto=` to the URL automatically.

---

## 6. Interaction details

### 6.1 Scroll → step mapping
- Each step is a `<section data-step="id">` with `min-height: 100vh` (B2 and B9: `180vh`, so the scrub has room). The panel is `position: sticky; top: 30vh` inside its section on desktop (sticky bottom on mobile), so text stays readable while the step scrubs.
- Active step: `IntersectionObserver` with `rootMargin: "-50% 0px -50% 0px"` (the viewport's centre line).
- Progress within a step: one rAF-throttled `scroll` listener computing `p = clamp((innerHeight/2 − rect.top) / rect.height, 0, 1)` for the active step only.
- Year: `year = from + (to − from) · easeInOutSine(p)` for range steps; integer-floored for filters, rendered digit-by-digit in the odometer. Point-year steps show their year for the whole step.
- State lives in a tiny external store (`lib/storyStore.ts`, `useSyncExternalStore`, no new dependency): `{ mode, stepId, progress, year }`. Replaces the `rios:chapter` window event.

### 6.2 Transitions
- Camera: on step change `map.flyTo({ ...camera, padding, duration: 2400 (desktop) / 1800 (mobile), curve: 1.3, essential: true })`. If another step activates within 400 ms (fast scroll), `map.stop()` then `easeTo` with 800 ms.
- Layer toggles per step: opacity transitions 600 ms (`*-opacity-transition`); `visibility` is only flipped after the opacity reaches 0.
- Panels: fade + 16px rise, 400 ms.
- Odometer: 180 ms per-digit roll.
- `obra` dash animation: `line-dasharray` sequence stepped every 80 ms (MapLibre "animate a line" pattern), only while a curated river is in `obra` state and the tab is visible.

### 6.3 Reduced motion (`prefers-reduced-motion: reduce`)
- `jumpTo` instead of `flyTo`, with a 250 ms opacity cross-fade of the map container (opacity is not "motion").
- Odometer swaps digits without rolling; pulse ring static; no `obra` dash animation (static dashed `garoa`).
- Scrubbing by scroll stays (it's user-driven), but the terrain pitch is capped at 30°.

### 6.4 Keyboard & a11y
- First tab stop: skip link `Pular para o mapa` (→ explore). Second: `Pular a história` is the same; don't duplicate.
- Story: native scrolling (Space / PgDn / arrows). Each panel has `tabindex="-1"` and gets a visible focus ring when targeted by `J`/`K` shortcuts (next/prev step, `scrollIntoView({ block: "center" })`); shortcuts listed in a `?` help popover.
- Explore: map keyboard handler on when the canvas is focused (`tabindex=0`, `aria-label="Mapa interativo dos rios de São Paulo"`); layer toggles are real checkboxes with `role="switch"`; Esc closes popovers and pick mode.
- Story text is the full content: the map is decorative during the story (`aria-hidden`), so a screen-reader user loses nothing.
- Focus rings: 2px `sódio-claro` outline, 2px offset.
- Tap targets ≥ 44px on mobile.

---

## 7. Implementation checklist (incremental — each step ships something visible)

1. **Tokens & type** — `web/lib/palette.ts` (new; exports the §1.1 tokens), `web/tailwind.config.ts` (import palette; `fontFamily.display/serif/mono` → CSS vars), `web/app/layout.tsx` (`next/font/google`: `Archivo({ axes: ["wdth"] })`, `Newsreader`, `IBM_Plex_Mono({ weight: ["400","500"] })`; vars on `<html>`), `web/app/globals.css` (bg `asfalto`, text `garoa`, grain utility, focus rings, MapLibre attribution restyle, reduced-motion overrides).
2. **Rivers-only style** — `web/lib/mapStyle.ts`: new `buildRiversOnlyStyle()` with the §1.4 stack and sources `limite`, `rios` (`/data/rios_sp.geojson`), `mask` (empty, filled in code), existing flood/basins/water/terrarium; `streets` source behind a flag. `web/lib/mask.ts` (new). `web/lib/rivers.ts`: switch props to `{ t, nm, via }`, repoint `BURIAL_COLOR`, add `NAME_PT`, `formatName`, `formatVia`.
3. **Scroll model & modes** (engineer's change) — `web/app/page.tsx` (fixed map + document-flow article), `web/lib/storyStore.ts` (new), `web/components/MapView.tsx` (handler enable/disable by mode, pointer-events, `#explorar`).
4. **Steps** — `web/lib/story.ts` (new; `StoryStep[]` for B0–B14 per §2, replacing `CHAPTERS`), `web/components/StoryScroller.tsx` (new; replaces `Scrollytelling.tsx`: sections, sticky panels, observer, progress), camera driver in `MapView.tsx` with responsive padding and `fit:` support.
   ```ts
   type Camera =
     | { center: [number, number]; zoom: number; pitch: number; bearing: number }
     | { fit: "municipio" | string[]; pitch?: number; bearing?: number; maxZoom?: number };
   type StoryStep = {
     id: string; kicker: string; title: string; body: string; note?: string;
     year: { from: number | "hoje" | "verao" | "voce"; to?: number | "hoje"; eventId?: string };
     camera: Camera;
     layers?: Partial<{ flood: boolean; streets: boolean; terrain: boolean; basins: boolean }>;
     network: "atual" | "passado" | "regra";
     glow?: "normal" | "forte";
     focus?: string[];
     callouts?: Array<{ lngLat?: [number, number]; nm?: string; text: string; sub?: string }>;
     stat?: { value: string; label: string };
     cta?: "perto" | "explorar";
   };
   ```
5. **Timeline engine** — `web/lib/timeline.ts` (new; §3.3 data + `stateAt(year)` + `filtersAt(year, network, focus)`), applied from `MapView.tsx` via `setFilter`/`setPaintProperty` when integer year or step changes.
6. **Hidrômetro + Régua** — `web/components/Hidrometro.tsx`, `web/components/Regua.tsx` (new), mounted in `page.tsx`, read the store.
7. **Callouts** — `web/components/StoryCallouts.tsx` (new; manages `maplibregl.Marker`s per step).
8. **Explore UI** — `web/components/ExploreBar.tsx` (new: wordmark, back to story, "Rio perto de mim"), `web/components/LayerToggles.tsx` (restyle; base options reduced to "Só água / Ruas / Satélite"; add "Ruas"), `web/components/Legend.tsx` (restyle; `Chave` compact variant for story), hover tooltip in `MapView.tsx` using `formatName`/`formatVia`, `HistoricalSwipe.tsx` only in explore.
9. **Rio perto de mim** — `web/lib/nearest.ts` (new; grid index, point-in-polygon, nearest buried/any), `web/components/PertoDeMim.tsx` (new; button, pick mode, result card, share), `perto-*` layers in `mapStyle.ts`, `?ponto=` handling in `page.tsx`.
10. **Mobile** — panel/odometer/bottom-sheet variants, camera padding & zoom offset, tap tooltips.
11. **Reduced motion & keyboard** — §6.3/§6.4 pass.
12. **Data honesty pass** — resolve every `[VERIFICAR]` (or soften copy to ranges/"por volta de"), add `source` to each `TimelineEvent`, generate `[DADO]` numbers from the ETL into `web/public/data/stats.json` and read them in `story.ts`.
13. **Acceptance pass** — §9.

---

## 8. Out of scope for this round (noted, not designed in detail)

- Explore-mode time scrubber reusing the régua (drag the year, curated rivers re-bury). The engine from step 5 makes it cheap; ship later.
- Hand-traced 1930 meanders (`tracados.geojson`) and a SARA 1930 swipe inside the story.
- Custom PBF glyphs for Archivo on the map.

---

## 9. Personality acceptance test

Check these in the running app (desktop 1440×900 and mobile 390×844) before calling it done:

1. **5-second test**: a first-time viewer, asked "what is this map of?", answers "São Paulo's rivers/water" within 5 s of the first screen — no street, building or label from a basemap is visible on B0.
2. Everything outside the municipality is ≥ 90 % dark (`mask` opacity 0.92); the city outline is visible at every story beat.
3. Buried rivers are the brightest lines on screen in B1 and B10; they are distinguishable from open rivers in greyscale (dashed vs solid).
4. **The year is visible on every story step** (odometer shows a number, range or one of `HOJE / TODO VERÃO / VOCÊ`) and the régua marker is on screen on every step.
5. **Monotonic time**: scrolling B3 → B12 downwards, the odometer value never decreases (only B2 rolls backwards).
6. In B4, scrolling slowly through the step visibly turns the Anhangabaú from blue to amber-dashed, with the odometer passing through the 1906–1938 range.
7. Every uncertain date shows the `c.` prefix or a faded band end; no `[VERIFICAR]` fact ships without either a source or softened copy.
8. Mouse wheel anywhere during the story scrolls the story; the map never zooms or pans. In explore, wheel zooms the map and the page does not scroll.
9. "Voltar à história" returns to B14 with the story scrollable and the map locked again; browser Back from `#explorar` does the same.
10. No rounded white card, no Georgia, no beige anywhere. Titles are Archivo condensed caps; body is Newsreader.
11. Every story panel has ≤ 60 words of body copy and names at least one concrete place (river, avenue or neighbourhood).
12. "Rio perto de mim" at `-23.5653, -46.6407` (Av. 23 de Maio; a vertex of a buried "Córrego Itororo" segment) returns the córrego Itororó, street "Av. 23 de Maio", distance < 30 m, headline `VOCÊ ESTÁ EM CIMA DE UM RIO.`; a point in Guarulhos returns `FORA DO MAPA.`; denying permission enters pick mode with the `SEM PROBLEMA.` copy. DevTools Network shows **zero requests** during the search.
13. With `prefers-reduced-motion: reduce`, there are no camera flights, rolling digits or pulsing rings, and the story is still fully understandable.
14. At 390px wide: no horizontal scroll, panel text ≥ 17px, the subject of each beat is visible above the panel, all tap targets ≥ 44px.
15. Keyboard only: Tab reaches "Pular para o mapa" first; J/K moves between steps; in explore every layer toggle and "Rio perto de mim" is reachable and operable.
