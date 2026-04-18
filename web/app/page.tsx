import MapShell from "@/components/MapShell";
import Scrollytelling from "@/components/Scrollytelling";

export default function Page() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapShell />
      </div>
      <Scrollytelling />
    </main>
  );
}
