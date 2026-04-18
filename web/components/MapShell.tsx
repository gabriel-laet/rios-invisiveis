"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="font-serif text-sm italic text-ink/50">carregando mapa…</div>
    </div>
  ),
});

export default function MapShell() {
  return <MapView />;
}
