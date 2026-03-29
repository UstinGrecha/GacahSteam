import { describe, expect, it } from "vitest";
import type { Rarity, SteamCard } from "@/lib/gacha/types";
import { simulateRaidToEnd } from "./engine";
import { raidBossForWeek } from "./weeklyBoss";
import type { RaidCardPick } from "./types";

function stubCard(
  rarity: Rarity,
  atk: number,
  def: number,
  hp: number,
): SteamCard {
  return {
    appid: 1,
    name: "T",
    headerImage: "https://example.com/h.jpg",
    storeUrl: "https://example.com",
    rarity,
    atk,
    def,
    hp,
    score: 70,
    positivePercent: 90,
    metacritic: 80,
    hasUserReviews: true,
    reviewCount: 10_000,
    releaseDateMs: Date.now() - 5e10,
    reviewScoreDesc: null,
    genres: [],
    traits: [],
  };
}

function picksFrom(cards: SteamCard[]): RaidCardPick[] {
  return cards.map((card, i) => ({
    pullId: `p${i}`,
    slotIndex: 0,
    card,
  }));
}

function winRateWeeks(
  team: RaidCardPick[],
  weeks: string[],
): number {
  let w = 0;
  for (const key of weeks) {
    const boss = raidBossForWeek(key);
    if (simulateRaidToEnd(boss, team).outcome === "victory") w += 1;
  }
  return w / weeks.length;
}

/** Фиксированный набор недель (разные соли босса). */
const W2026 = Array.from({ length: 52 }, (_, i) => {
  const n = i + 1;
  return `2026-W${String(n).padStart(2, "0")}`;
});

describe("raid balance (simulated)", () => {
  it("sanity: trivial boss is a win", () => {
    const average = picksFrom([
      stubCard("legend", 118, 88, 255),
      stubCard("holo", 105, 82, 240),
      stubCard("epic", 92, 72, 220),
      stubCard("rare", 82, 66, 205),
      stubCard("uncommon", 74, 60, 190),
    ]);
    const baby = {
      weekKey: "trivial",
      nameKey: "b0",
      maxHp: 120,
      atk: 4,
      def: 0,
    } as const;
    expect(simulateRaidToEnd(baby, average).outcome).toBe("victory");
  });

  it("targets: average deck sometimes wins; commons mostly lose; strong usually wins", () => {
    /** Эталонные статы под текущий `RAID_BOSS_POWER_MULT` в `weeklyBoss.ts`. */
    const average = picksFrom([
      stubCard("legend", 186, 100, 302),
      stubCard("holo", 168, 92, 278),
      stubCard("epic", 152, 85, 256),
      stubCard("rare", 138, 78, 238),
      stubCard("uncommon", 126, 72, 220),
    ]);

    const commons = picksFrom([
      stubCard("common", 48, 42, 135),
      stubCard("common", 46, 40, 130),
      stubCard("common", 45, 39, 128),
      stubCard("common", 44, 38, 126),
      stubCard("uncommon", 52, 44, 142),
    ]);

    const strong = picksFrom([
      stubCard("legend", 234, 132, 468),
      stubCard("legend", 226, 128, 458),
      stubCard("holo", 210, 121, 438),
      stubCard("holo", 202, 117, 428),
      stubCard("epic", 188, 109, 402),
    ]);

    const pAvg = winRateWeeks(average, W2026);
    const pCom = winRateWeeks(commons, W2026);
    const pStr = winRateWeeks(strong, W2026);

    expect(pCom).toBeLessThan(0.12);
    expect(pAvg).toBeGreaterThan(0.18);
    expect(pAvg).toBeLessThan(0.72);
    expect(pStr).toBeGreaterThan(0.55);
  });
});
