import { HomeHero } from "@/components/HomeHero";
import { PackOpener } from "@/components/PackOpener";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8">
      <HomeHero />
      <PackOpener />
    </main>
  );
}
