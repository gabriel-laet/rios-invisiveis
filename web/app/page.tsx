import MapShell from "@/components/MapShell";
import StoryScroller, { SkipLink } from "@/components/StoryScroller";
import TimeDevice from "@/components/Hidrometro";
import ExploreBar from "@/components/ExploreBar";

export default function Page() {
  return (
    <main className="relative">
      <SkipLink />
      <MapShell />
      <TimeDevice />
      <StoryScroller />
      <ExploreBar />
    </main>
  );
}
