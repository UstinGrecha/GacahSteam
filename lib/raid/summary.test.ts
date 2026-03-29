import { describe, expect, it } from "vitest";
import { buildRaidBattleSummary } from "./summary";
import type { RaidRunState } from "./types";

describe("buildRaidBattleSummary", () => {
  it("aggregates player_attack damage and heals", () => {
    const state = {
      boss: {
        weekKey: "2026-W01",
        nameKey: "b0",
        maxHp: 1000,
        atk: 100,
        def: 50,
      },
      bossHp: 400,
      party: [],
      activeSlot: 0,
      phase: "heroes" as const,
      outcome: "ongoing" as const,
      round: 2,
      log: [
        {
          kind: "player_attack" as const,
          actor: "A",
          damage: 30,
          bossHpAfter: 970,
          slot: 0,
        },
        {
          kind: "player_attack" as const,
          actor: "B",
          damage: 50,
          bossHpAfter: 920,
          slot: 1,
          heal: 12,
        },
        {
          kind: "boss_slaughter" as const,
          hits: [],
          enraged: false,
        },
      ],
    } satisfies RaidRunState;

    const s = buildRaidBattleSummary(state);
    expect(s.totalDamageToBoss).toBe(80);
    expect(s.damageBySlot[0]).toBe(30);
    expect(s.damageBySlot[1]).toBe(50);
    expect(s.mvpSlot).toBe(1);
    expect(s.totalHealing).toBe(12);
    expect(s.heroAttacks).toBe(2);
    expect(s.bossHitsSurvived).toBe(1);
  });
});
