"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { insideCity, nearestRiver, type NearestHit } from "@/lib/nearest";
import { loadCity, loadRivers, whenMap } from "@/lib/mapHandle";
import { applyNetwork } from "@/lib/mapStyle";
import { formatName, formatVia } from "@/lib/timeline";
import { enterExplore } from "@/lib/modes";
import { prefersReducedMotion, useStory } from "@/lib/storyStore";
import { calloutElement } from "./StoryCallouts";
import { setTerrain } from "./MapView";

type Result =
  | { kind: "found"; at: [number, number]; buried: NearestHit; any: NearestHit; shared: boolean; accuracy?: number }
  | { kind: "outside" }
  | { kind: "denied" }
  | { kind: "pick" };

function fmtDist(m: number) {
  if (m < 5) return "poucos metros";
  if (m >= 1000) return `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  return `${Math.round(m / (m < 100 ? 5 : 10)) * (m < 100 ? 5 : 10)} m`;
}

const PRIVACY = "Sua localização fica só no seu navegador. Nada é enviado a servidor nenhum.";

/** "Rio perto de mim" (docs/STORY_DESIGN.md §5): all client-side. */
export default function PertoDeMim() {
  const mode = useStory((s) => s.mode);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const markers = useRef<maplibregl.Marker[]>([]);
  const pickHandler = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);

  const clearMap = useCallback(async () => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    const map = await whenMap();
    (map.getSource("perto") as maplibregl.GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
  }, []);

  const stopPicking = useCallback(async () => {
    const map = await whenMap();
    if (pickHandler.current) map.off("click", pickHandler.current);
    pickHandler.current = null;
    map.getCanvas().style.cursor = "";
  }, []);

  const search = useCallback(
    async (at: [number, number], opts: { shared?: boolean; accuracy?: number } = {}) => {
      setBusy(true);
      const [city, rivers, map] = await Promise.all([loadCity(), loadRivers(), whenMap()]);
      setBusy(false);
      if (!insideCity(city, at)) {
        await clearMap();
        setResult({ kind: "outside" });
        startPicking();
        return;
      }
      await stopPicking();
      const buried = nearestRiver(rivers, at, (p) => p.t === "b");
      const any = nearestRiver(rivers, at);
      if (!buried || !any) return;

      // map: point, plumb line, highlight
      (map.getSource("perto") as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: at } },
          { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [at, buried.point] } },
        ],
      });
      markers.current.forEach((m) => m.remove());
      const ring = document.createElement("div");
      ring.className = "pulse-ring";
      const mid: [number, number] = [(at[0] + buried.point[0]) / 2, (at[1] + buried.point[1]) / 2];
      const dist = document.createElement("div");
      dist.className = "font-mono text-[11px] text-garoa bg-asfalto/80 px-1";
      dist.textContent = fmtDist(buried.distance);
      const via = formatVia(buried.props.via);
      markers.current = [
        new maplibregl.Marker({ element: ring }).setLngLat(at).addTo(map),
        ...(buried.distance >= 10 ? [new maplibregl.Marker({ element: dist }).setLngLat(mid).addTo(map)] : []),
        new maplibregl.Marker({
          element: calloutElement(formatName(buried.props.nm), via ? `sob a ${via}` : undefined),
          anchor: "bottom-left",
        })
          .setLngLat(buried.point)
          .addTo(map),
      ];
      markers.current.at(-1)!.getElement().classList.add("on");

      applyNetwork(map, { network: "atual", year: "HOJE", progress: 1, focus: buried.props.nm ? [buried.props.nm] : [] });
      setTerrain(map, !prefersReducedMotion());
      const bounds = new maplibregl.LngLatBounds(at, at).extend(buried.point);
      const cam = map.cameraForBounds(bounds, { padding: { top: 120, bottom: 260, left: 60, right: 60 }, maxZoom: 17 });
      if (cam) {
        const target = { ...cam, zoom: Math.max(15, Math.min(17, cam.zoom ?? 15)), pitch: prefersReducedMotion() ? 0 : 50 };
        if (prefersReducedMotion()) map.jumpTo(target);
        else map.flyTo({ ...target, duration: 2400, essential: true });
      }
      setResult({ kind: "found", at, buried, any, shared: !!opts.shared, accuracy: opts.accuracy });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearMap, stopPicking],
  );

  const startPicking = useCallback(async () => {
    const map = await whenMap();
    if (pickHandler.current) return;
    map.getCanvas().style.cursor = "crosshair";
    const h = (e: maplibregl.MapMouseEvent) => void search([e.lngLat.lng, e.lngLat.lat]);
    pickHandler.current = h;
    map.on("click", h);
  }, [search]);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setResult({ kind: "denied" });
      void startPicking();
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        void search([pos.coords.longitude, pos.coords.latitude], { accuracy: pos.coords.accuracy });
      },
      () => {
        setBusy(false);
        setResult({ kind: "denied" });
        void startPicking();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [search, startPicking]);

  // requests from the story (B13) and the explore bar
  useEffect(() => {
    const onReq = (e: Event) => {
      const how = (e as CustomEvent<{ how: "locate" | "pick" }>).detail?.how;
      enterExplore();
      void clearMap();
      if (how === "pick") {
        setResult({ kind: "pick" });
        void startPicking();
      } else locate();
    };
    window.addEventListener("rios:perto", onReq);
    return () => window.removeEventListener("rios:perto", onReq);
  }, [clearMap, locate, startPicking]);

  // shared link: /?ponto=lat,lon
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("ponto");
    if (!p) return;
    const [lat, lon] = p.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) void search([lon, lat], { shared: true });
  }, [search]);

  // Esc cancels pick mode / closes the card; leaving explore clears everything
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      void stopPicking();
      setResult(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopPicking]);

  useEffect(() => {
    if (mode === "story") {
      void stopPicking();
      void clearMap();
      setResult(null);
    }
  }, [mode, clearMap, stopPicking]);

  if (mode !== "explore" || (!result && !busy)) return null;

  return (
    <div
      className="panel pointer-events-auto fixed inset-x-4 bottom-4 z-40 p-5 md:inset-x-auto md:bottom-8 md:left-1/2 md:w-[440px] md:-translate-x-1/2"
      role="status"
    >
      {busy && <div className="font-mono text-xs uppercase tracking-[0.12em] text-neblina">Procurando o rio…</div>}
      {!busy && result && <Card result={result} onRetry={() => { void clearMap(); setResult({ kind: "pick" }); void startPicking(); }} onClose={() => { void stopPicking(); setResult(null); }} />}
      <p className="mt-4 font-mono text-[10px] text-neblina">{PRIVACY}</p>
    </div>
  );
}

function Card({ result, onRetry, onClose }: { result: Result; onRetry: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (result.kind === "pick")
    return (
      <>
        <div className="kicker">Escolha um ponto</div>
        <h2 className="display mt-2 text-[28px]">Toque no mapa</h2>
        <p className="mt-2 text-[17px] text-garoa/90">Sua casa, seu trabalho, aquela esquina que sempre alaga. Esc cancela.</p>
      </>
    );
  if (result.kind === "denied")
    return (
      <>
        <h2 className="display text-[28px]">Sem problema.</h2>
        <p className="mt-2 text-[17px] text-garoa/90">
          Toque em qualquer ponto do mapa — sua casa, seu trabalho, aquela esquina que sempre alaga — e a gente procura o rio.
        </p>
      </>
    );
  if (result.kind === "outside")
    return (
      <>
        <h2 className="display text-[28px] text-alerta">Fora do mapa.</h2>
        <p className="mt-2 text-[17px] text-garoa/90">
          Esse ponto fica fora da cidade de São Paulo, e este mapa só conhece os rios da capital. Toque em um ponto dentro do contorno.
        </p>
      </>
    );

  const { buried, any, shared, accuracy, at } = result;
  const d = buried.distance;
  const nome = formatName(buried.props.nm);
  const via = formatVia(buried.props.via);
  const sob = via ? `, sob a ${via}` : "";
  let head: string;
  let body: string;
  if (shared) {
    head = "Tem um rio aqui embaixo.";
    body = `O ${nome} passa a ${fmtDist(d)} deste ponto${sob}.`;
  } else if (d < 30) {
    head = "Você está em cima de um rio.";
    body = `O ${nome} corre aqui embaixo${sob}. Está a ${d < 5 ? "" : "uns "}${fmtDist(d)} dos seus pés — no escuro, mas correndo.`;
  } else if (d <= 300) {
    head = `Tem um rio a ${fmtDist(d)}.`;
    body = `O rio enterrado mais perto de você é o ${nome}.${via ? ` Ele passa sob a ${via}.` : ""} Dá pra ir a pé.`;
  } else {
    head = `O rio enterrado mais perto fica a ${fmtDist(d)}.`;
    body = `É o ${nome}${sob}.`;
    if (any.props.t !== "b" && any.distance < d) {
      body += ` Mas o ${formatName(any.props.nm)}, a ${fmtDist(any.distance)}, ainda corre a céu aberto. Vale a visita.`;
    }
  }

  const share = async () => {
    const url = `${location.origin}${location.pathname}?ponto=${at[1].toFixed(3)},${at[0].toFixed(3)}`;
    const text = `Tem um rio embaixo ${via ? `da ${via}` : "daqui"}: o ${nome}. Veja no mapa.`;
    try {
      if (navigator.share) await navigator.share({ url, text });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="display text-[28px] md:text-[32px]">{head}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="min-h-[32px] px-2 text-neblina hover:text-garoa">
          ✕
        </button>
      </div>
      <p className="mt-2 text-[17px] leading-[1.5] text-garoa/90">{body}</p>
      {accuracy !== undefined && accuracy > 100 && (
        <p className="mt-2 font-mono text-[11px] text-neblina">
          Sua localização tem precisão de ±{Math.round(accuracy)} m. O resultado pode variar um pouco.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={share}>
          {copied ? "Link copiado" : "Compartilhar"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Tentar outro ponto
        </button>
      </div>
      <p className="mt-2 font-mono text-[10px] text-neblina">O link inclui o ponto, arredondado para ~100 m.</p>
    </>
  );
}
