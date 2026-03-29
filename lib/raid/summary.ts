import type { RaidRunState } from "./types";

export type RaidBattleSummary = {
  totalDamageToBoss: number;
  heroAttacks: number;
  damageBySlot: number[];
  mvpSlot: number;
  totalHealing: number;
  bossHitsSurvived: number;
};

/** Агрегирует лог после боя (MVP по суммарному урону в цель). */
export function buildRaidBattleSummary(state: RaidRunState): RaidBattleSummary {
  const damageBySlot = [0, 0, 0, 0, 0];
  let heroAttacks = 0;
  let totalHealing = 0;
  let bossHits = 0;

  for (const e of state.log) {
    if (e.kind === "player_attack") {
      heroAttacks += 1;
      damageBySlot[e.slot] = (damageBySlot[e.slot] ?? 0) + e.damage;
      totalHealing += e.heal ?? 0;
    } else if (e.kind === "boss_slaughter") {
      bossHits += 1;
    }
  }

  const totalDamageToBoss = damageBySlot.reduce((a, b) => a + b, 0);
  const maxDmg = Math.max(...damageBySlot);
  const mvpSlot = maxDmg > 0 ? damageBySlot.indexOf(maxDmg) : 0;

  return {
    totalDamageToBoss,
    heroAttacks,
    damageBySlot,
    mvpSlot,
    totalHealing,
    bossHitsSurvived: bossHits,
  };
}
