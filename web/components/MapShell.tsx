"use client";

import dynamic from "next/dynamic";

const MapStage = dynamic(() => import("./MapStage"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-asfalto">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-neblina">carregando a água…</div>
    </div>
  ),
});

export default function MapShell() {
  return <MapStage />;
}
