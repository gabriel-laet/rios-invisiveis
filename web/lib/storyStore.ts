"use client";

import { useSyncExternalStore } from "react";

export type Mode = "story" | "explore";

export type StoryState = {
  mode: Mode;
  stepId: string;
  /** 0..1 progress through the active step */
  progress: number;
  /** current year: a number while scrubbing, or a word ("HOJE", "TODO VERÃO", "VOCÊ") */
  year: number | string;
  /** set when the map is ready for camera moves */
  mapReady: boolean;
};

let state: StoryState = { mode: "story", stepId: "capa", progress: 0, year: "HOJE", mapReady: false };
const listeners = new Set<() => void>();

export function getStory(): StoryState {
  return state;
}

export function setStory(patch: Partial<StoryState>) {
  let changed = false;
  for (const k of Object.keys(patch) as Array<keyof StoryState>) {
    if (state[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeStory(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useStory<T>(select: (s: StoryState) => T): T {
  return useSyncExternalStore(
    subscribeStory,
    () => select(state),
    () => select(state),
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}
