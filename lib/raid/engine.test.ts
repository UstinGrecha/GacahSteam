import { describe, expect, it } from "vitest";
import type { Rarity, SteamCard } from "@/lib/gacha/types";
import {
  advanceRaidStep,
  createRaidRun,
  simulateRaidToEnd,
} from "./engine";
import { raidBossForWeek } from "./weeklyBoss";
import type { RaidCardPick } from "./types";

function stubCard(
  rarity: Rarity,
  atk: number,
  def: number,
  hp: number,
): SteamCard {
  return {
    appid: Math.floor(Math.random() * 1e6),
    name: "Test",
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

describe("raid engine", () => {
  it("requires five cards", () => {
    const boss = raidBossForWeek("2026-W01");
    const four = picksFrom([
      stubCard("legend", 120, 90, 300),
      stubCard("legend", 120, 90, 300),
      stubCard("legend", 120, 90, 300),
      stubCard("legend", 120, 90, 300),
    ]);
    expect(() => createRaidRun(boss, four)).toThrow("raid_requires_five_cards");
  });

  it("ends in victory or defeat", () => {
    const boss = raidBossForWeek("2026-W10");
    const team = picksFrom([
      stubCard("legend", 130, 95, 280),
      stubCard("holo", 110, 85, 260),
      stubCard("epic", 95, 75, 240),
      stubCard("rare", 85, 70, 220),
      stubCard("rare", 80, 68, 210),
    ]);
    const final = simulateRaidToEnd(boss, team);
    expect(["victory", "defeat"]).toContain(final.outcome);
    expect(final.log.length).toBeGreaterThan(0);
  });

  it("advanceStep changes state monotonically until terminal", () => {
    const boss = raidBossForWeek("2026-W03");
    const team = picksFrom([
      stubCard("common", 40, 35, 120),
      stubCard("common", 40, 35, 120),
      stubCard("common", 40, 35, 120),
      stubCard("common", 40, 35, 120),
      stubCard("common", 40, 35, 120),
    ]);
    let s = createRaidRun(boss, team);
    let steps = 0;
    while (s.outcome === "ongoing" && steps < 3000) {
      const next = advanceRaidStep(s);
      expect(next.log.length).toBeGreaterThanOrEqual(s.log.length);
      s = next;
      steps += 1;
    }
    expect(s.outcome).not.toBe("ongoing");
  });
});
