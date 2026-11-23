"use client";

import MapView from "./MapView";
import StoryCallouts from "./StoryCallouts";
import PertoDeMim from "./PertoDeMim";

/** Everything that touches MapLibre; loaded client-only by MapShell. */
export default function MapStage() {
  return (
    <>
      <MapView />
      <StoryCallouts />
      <PertoDeMim />
    </>
  );
}
