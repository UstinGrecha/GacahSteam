import { HomeHero } from "@/components/HomeHero";
import { PackPageLeaderboard } from "@/components/PackPageLeaderboard";
import { PackOpener } from "@/components/PackOpener";

export default function HomePage() {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-8">
      <HomeHero />
      <div className="flex w-full max-w-full flex-col items-stretch gap-8 self-stretch md:flex-row md:flex-nowrap md:items-start md:gap-8">
        <div className="flex min-w-0 flex-1 flex-col items-center md:min-w-0">
          <PackOpener />
        </div>
        <PackPageLeaderboard className="w-full shrink-0 md:sticky md:top-[4.75rem] md:w-80 lg:w-[22rem] xl:w-96" />
      </div>
    </main>
  );
}
