"use client";

import { getStory, setStory } from "./storyStore";

// Story ⇄ explore (docs/STORY_DESIGN.md §4.3). Story: the page scrolls and the
// map is a backdrop. Explore: the page stops, the map takes input.

export function enterExplore(opts: { push?: boolean } = {}) {
  if (getStory().mode === "explore") return;
  document.body.classList.add("explore");
  setStory({ mode: "explore" });
  if (opts.push !== false && location.hash !== "#explorar") {
    history.pushState({ explore: true }, "", `${location.pathname}${location.search}#explorar`);
  }
}

export function backToStory(opts: { fromPopState?: boolean } = {}) {
  if (getStory().mode === "story") return;
  document.body.classList.remove("explore");
  // Land at the top of the hand-off beat, not the very start (StoryScroller does
  // the scroll once the article is visible again). Set before the mode flips:
  // React may re-render synchronously inside setStory.
  returnStep = "explorar";
  setStory({ mode: "story", stepId: "explorar" });
  if (!opts.fromPopState && location.hash === "#explorar") {
    history.pushState({}, "", `${location.pathname}${location.search}`);
  }
}

let returnStep: string | null = null;
export function consumeReturnStep() {
  const s = returnStep;
  returnStep = null;
  return s;
}

/** Ask the "Rio perto de mim" widget to start: by geolocation or by picking a point. */
export function startPerto(how: "locate" | "pick") {
  window.dispatchEvent(new CustomEvent("rios:perto", { detail: { how } }));
}
