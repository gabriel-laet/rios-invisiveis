#!/usr/bin/env node
// Personality & behaviour acceptance test (docs/STORY_DESIGN.md §9).
//
//   pnpm dev                       # in another terminal
//   pnpm acceptance [outDir]       # screenshots of every step land in outDir
//
// Uses your installed Chrome/Chromium (CHROME_PATH to override), headless,
// with software WebGL. BASE_URL defaults to http://localhost:3000.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "acceptance-out";
const CHROME =
  process.env.CHROME_PATH ??
  ["/usr/bin/chromium", "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(
    existsSync,
  );
if (!CHROME) throw new Error("No Chrome found; set CHROME_PATH");
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  #${id} ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function open(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR", ...extra });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + (extra.path ?? "/"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__riosMap && window.__riosMap.isStyleLoaded(), null, { timeout: 90_000 });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

const helpers = () => {
  window.__go = (id, p = 0.5) => {
    const el = document.querySelector(`[data-step="${id}"]`);
    window.scrollTo({ top: el.offsetTop + p * el.offsetHeight - innerHeight / 2, behavior: "instant" });
  };
  // What the odometer shows: a year (prefixed "c." when uncertain) or a word.
  window.__odo = () => {
    const el = [...document.querySelectorAll("[data-year]")].find((e) => e.offsetParent);
    if (!el) return "";
    return (el.dataset.uncertain ? "c." : "") + el.dataset.year;
  };
};

const STEP_IDS = ["capa", "chave", "rebobinar", "piratininga", "anhangabau", "tamanduatei", "pinheiros", "avenidas", "tiete", "regra", "hoje", "sul", "enchente", "perto", "explorar"];

// ---------------------------------------------------------------- desktop story
{
  const { ctx, page, errors } = await open({ width: 1440, height: 900 });
  await page.evaluate(helpers);

  // #1 first screen: only water, no basemap/streets
  const first = await page.evaluate(() => {
    const m = window.__riosMap;
    return {
      basemap: m.getLayoutProperty("basemap", "visibility"),
      streets: m.getLayoutProperty("streets", "visibility"),
      symbols: m.getStyle().layers.filter((l) => l.type === "symbol").length,
    };
  });
  check(1, "First screen shows only São Paulo's water", first.basemap === "none" && first.streets === "none" && first.symbols === 0, JSON.stringify(first));
  await page.screenshot({ path: join(OUT, "00-capa.png") });

  // walk every step forward (time only moves forward)
  const perStep = [];
  for (const [i, id] of STEP_IDS.entries()) {
    await page.evaluate((id) => window.__go(id, 0.5), id);
    await page.waitForTimeout(2800);
    const s = await page.evaluate(() => {
      const m = window.__riosMap;
      const panel = document.querySelector(`[data-step="${document.querySelector("[data-step]") && ""}"]`);
      return {
        odo: window.__odo(),
        regua: !!document.querySelector(".fixed.right-6.top-1\\/2"),
        mask: m.getPaintProperty("mask", "fill-opacity"),
        outline: m.getLayoutProperty("outline", "visibility") !== "none",
      };
    });
    perStep.push({ id, ...s });
    await page.screenshot({ path: join(OUT, `${String(i + 1).padStart(2, "0")}-${id}.png`) });
  }
  check(2, "Mask ≥ 0.9 and outline visible on every step", perStep.every((s) => s.mask >= 0.9 && s.outline), perStep.filter((s) => !(s.mask >= 0.9 && s.outline)).map((s) => s.id).join(",") || "all ok");
  check(4, "Year visible and régua on screen on every step", perStep.every((s) => s.odo.length > 0 && s.regua), perStep.map((s) => `${s.id}:${s.odo}`).join(" "));

  // #3 buried brightest in B1/B10
  await page.evaluate(() => window.__go("chave", 0.5));
  await page.waitForTimeout(1500);
  const glow = await page.evaluate(() => window.__riosMap.getPaintProperty("net-enterrado-glow", "line-opacity"));
  const dash = await page.evaluate(() => window.__riosMap.getPaintProperty("net-enterrado", "line-dasharray"));
  check(3, "Buried rivers glow strongly in B1 and are dashed", glow >= 0.4 && Array.isArray(dash), `glow=${glow} dash=${JSON.stringify(dash)}`);

  // #5 monotonic time B3 → B12 + #6 Anhangabaú vivo → obra → final + #7 "c."
  await page.evaluate(() => window.__go("piratininga", 0.1));
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector('[data-step="piratininga"]').offsetTop);
  const end = await page.evaluate(() => {
    const el = document.querySelector('[data-step="enchente"]');
    return el.offsetTop + el.offsetHeight;
  });
  const years = []; // { step, year }
  const anhangabau = []; // state transitions, in order
  let sawC = false;
  for (let y = top; y < end; y += 120) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => {
      const m = window.__riosMap;
      const st = ["cur-vivo", "cur-obra", "cur-final-enterrado"].find((id) => JSON.stringify(m.getFilter(id)).includes("Córrego Anhangabau"));
      const odoEl = [...document.querySelectorAll("[data-year]")].find((e) => e.offsetParent);
      return { odo: window.__odo(), state: st, step: odoEl?.dataset.odoStep, from: Number(odoEl?.dataset.from) };
    });
    const n = Number((r.odo.match(/\d{4}/) ?? [])[0]);
    if (Number.isFinite(n)) years.push({ step: r.step, year: n, from: r.from });
    if (r.odo.startsWith("c.")) sawC = true;
    if (r.state && anhangabau.at(-1)?.split("@")[0] !== r.state) anhangabau.push(`${r.state}@${r.step}:${r.odo}`);
  }
  // Historical ranges overlap (Anhangabaú 1906–1938, then Tamanduateí from 1911), so the
  // odometer may step back *between* beats. Rule enforced: within a beat time only moves
  // forward, and beats are in order of their start year.
  const backwards = years.filter((y, i) => i > 0 && y.step === years[i - 1].step && y.year < years[i - 1].year).map((y) => `${y.step}:${y.year}`);
  const withinOk = backwards.length === 0;
  const starts = [];
  for (const y of years) if (y.step !== "rebobinar" && (!starts.length || starts.at(-1).step !== y.step)) starts.push(y);
  const startsOk = starts.every((s, i) => i === 0 || s.from >= starts[i - 1].from);
  const firstYears = Object.fromEntries(starts.map((s) => [s.step, s.from]));
  check(5, "After the rewind, time only moves forward within a beat; beats in start-year order", withinOk && startsOk && years.length > 10, JSON.stringify(firstYears) + (backwards.length ? ` backwards at ${backwards.join(",")}` : ""));
  const seq = anhangabau;
  check(6, "Anhangabaú turns blue → obra → buried, and stays buried", seq.map((x) => x.split("@")[0]).join() === "cur-vivo,cur-obra,cur-final-enterrado", seq.join(" → "));
  check(7, "Uncertain dates are marked “c.”", sawC);

  // #10 identity: fonts and background
  const ident = await page.evaluate(() => {
    const h = document.querySelector("h2");
    const p = document.querySelector("[data-panel] p");
    return {
      h2: getComputedStyle(h).fontFamily,
      p: getComputedStyle(p).fontFamily,
      bg: getComputedStyle(document.body).backgroundColor,
      georgiaFirst: /^Georgia/.test(getComputedStyle(p).fontFamily),
    };
  });
  check(10, "Archivo titles, Newsreader body, asphalt background", /archivo/i.test(ident.h2) && /newsreader/i.test(ident.p) && ident.bg === "rgb(14, 19, 22)" && !ident.georgiaFirst, JSON.stringify(ident));

  // #11 ≤ 60 words per panel body
  const words = await page.evaluate(() =>
    [...document.querySelectorAll("[data-step]")].map((s) => ({
      id: s.dataset.step,
      n: (s.querySelector("[data-panel] > p")?.textContent ?? "").trim().split(/\s+/).length,
    })),
  );
  const over = words.filter((w) => w.n > 60);
  check(11, "Every panel body ≤ 60 words", over.length === 0, over.map((w) => `${w.id}:${w.n}`).join(",") || `max ${Math.max(...words.map((w) => w.n))}`);

  // #8 wheel: story scrolls, map stays; explore: map zooms, page stays
  await page.evaluate(() => window.__go("hoje", 0.3));
  await page.waitForTimeout(2600);
  const before = await page.evaluate(() => ({ y: scrollY, z: window.__riosMap.getZoom() }));
  await page.mouse.move(1000, 450);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ y: scrollY, z: window.__riosMap.getZoom() }));
  const storyOk = after.y > before.y && Math.abs(after.z - before.z) < 0.01;

  await page.evaluate(() => window.__go("explorar", 0.5));
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Explorar o mapa →" }).click();
  await page.waitForTimeout(800);
  const eb = await page.evaluate(() => ({ y: scrollY, z: window.__riosMap.getZoom() }));
  await page.mouse.move(900, 450);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(800);
  const ea = await page.evaluate(() => ({ y: scrollY, z: window.__riosMap.getZoom() }));
  const exploreOk = ea.z > eb.z + 0.1 && ea.y === eb.y;
  check(8, "Wheel scrolls the story (map still); in explore it zooms the map", storyOk && exploreOk, `story Δy=${Math.round(after.y - before.y)} Δz=${(after.z - before.z).toFixed(2)} · explore Δz=${(ea.z - eb.z).toFixed(2)} Δy=${ea.y - eb.y}`);
  await page.screenshot({ path: join(OUT, "20-explorar.png") });

  // #9 back to story via button and via browser Back
  await page.getByRole("button", { name: /história/ }).click();
  await page.waitForTimeout(600);
  const back1 = await page.evaluate(() => ({
    hidden: document.querySelector("article").classList.contains("hidden"),
    near: Math.abs(scrollY - document.querySelector('[data-step="explorar"]').offsetTop) < 5,
    hash: location.hash,
  }));
  await page.getByRole("button", { name: "Explorar o mapa →" }).click();
  await page.waitForTimeout(400);
  await page.goBack();
  await page.waitForTimeout(600);
  const back2 = await page.evaluate(() => !document.querySelector("article").classList.contains("hidden"));
  check(9, "“Voltar à história” and browser Back return to the hand-off step", !back1.hidden && back1.near && back2, JSON.stringify({ ...back1, back2 }));

  check(0, "No page errors (desktop)", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- Rio perto de mim
{
  const itororo = { latitude: -23.5653, longitude: -46.6407 };
  const { ctx, page } = await open({ width: 1440, height: 900 }, { geolocation: itororo, permissions: ["geolocation"] });
  const leaked = [];
  page.on("request", (r) => {
    if (/-23\.56|-46\.64/.test(r.url())) leaked.push(r.url());
  });
  await page.evaluate(helpers);
  await page.evaluate(() => window.__go("perto", 0.5));
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Encontrar o rio mais perto/ }).click();
  await page.waitForSelector("[role=status] h2", { timeout: 20_000 });
  await page.waitForTimeout(2600);
  const card = await page.evaluate(() => document.querySelector("[role=status]").innerText);
  await page.screenshot({ path: join(OUT, "30-perto-itororo.png") });
  const metres = /poucos metros/.test(card) ? 0 : Number((card.match(/(\d+) m\b/) ?? [])[1]);
  check(
    12,
    "Rio perto de mim at Av. 23 de Maio → Itororó, < 30 m, “você está em cima”",
    /em cima de um rio/i.test(card) && /Itororó/.test(card) && /23 de Maio/.test(card) && metres < 30,
    card.split("\n").slice(0, 2).join(" / "),
  );
  check("12b", "Location never leaves the browser", leaked.length === 0, leaked[0] ?? "no request carried the coordinates");

  // outside the city (Guarulhos) via pick mode
  await page.getByRole("button", { name: "Tentar outro ponto" }).click();
  await page.waitForTimeout(300);
  const pt = await page.evaluate(() => {
    const m = window.__riosMap;
    m.jumpTo({ center: [-46.53, -23.44], zoom: 11, pitch: 0 });
    const p = m.project([-46.53, -23.44]);
    return { x: p.x, y: p.y };
  });
  await page.waitForTimeout(500);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(800);
  const outside = await page.evaluate(() => document.querySelector("[role=status]")?.innerText ?? "");
  check("12c", "A point in Guarulhos says “Fora do mapa”", /fora do mapa/i.test(outside), outside.split("\n")[0]);
  await ctx.close();

  const denied = await open({ width: 1440, height: 900 }, { permissions: [] });
  await denied.page.evaluate(helpers);
  await denied.page.evaluate(() => window.__go("perto", 0.5));
  await denied.page.waitForTimeout(1000);
  await denied.page.getByRole("button", { name: /Encontrar o rio mais perto/ }).click();
  await denied.page.waitForTimeout(2500);
  const d = await denied.page.evaluate(() => document.querySelector("[role=status]")?.innerText ?? "");
  check("12d", "Denied permission → “Sem problema” + pick mode", /sem problema/i.test(d), d.split("\n")[0]);
  await denied.ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, { reducedMotion: "reduce" });
  await page.evaluate(helpers);
  await page.evaluate(() => window.__go("anhangabau", 0.5));
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ moving: window.__riosMap.isMoving(), pitch: window.__riosMap.getPitch() }));
  check(13, "Reduced motion: no camera flights, pitch ≤ 30°", !r.moving && r.pitch <= 30.5, JSON.stringify(r));
  await ctx.close();
}

// ---------------------------------------------------------------- mobile
{
  const { ctx, page } = await open({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await page.evaluate(helpers);
  await page.evaluate(() => window.__go("anhangabau", 0.5));
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const panel = document.querySelector('[data-step="anhangabau"] [data-panel] > p');
    const small = [...document.querySelectorAll("button, a")]
      .filter((b) => b.offsetParent && getComputedStyle(b).visibility !== "hidden")
      .map((b) => ({ t: b.textContent.trim().slice(0, 20), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h > 0 && b.h < 44);
    return {
      hscroll: document.documentElement.scrollWidth > innerWidth,
      font: parseFloat(getComputedStyle(panel).fontSize),
      small,
    };
  });
  await page.screenshot({ path: join(OUT, "40-mobile-anhangabau.png") });
  check(14, "Mobile 390px: no horizontal scroll, text ≥ 17px, tap targets ≥ 44px", !m.hscroll && m.font >= 17 && m.small.length === 0, JSON.stringify(m));
  await ctx.close();
}

// ---------------------------------------------------------------- keyboard
{
  const { ctx, page } = await open({ width: 1440, height: 900 });
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press("j");
  await page.waitForTimeout(1200);
  await page.keyboard.press("j");
  await page.waitForTimeout(1200);
  const step = await page.evaluate(() => document.activeElement?.closest("[data-step]")?.dataset.step);
  check(15, "Keyboard: first Tab is “Pular para o mapa”; J moves between steps", first === "Pular para o mapa" && step === "rebobinar", `first=${first} afterJJ=${step}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed · screenshots in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
