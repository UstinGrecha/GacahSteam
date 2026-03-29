import type { RaidBossStats } from "./types";

/** Индекс титула босса по неделе (для i18n `raid.bossNames[i]`). */
const BOSS_NAME_KEYS = [
  "b0",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
  "b10",
  "b11",
  "b12",
  "b13",
  "b14",
  "b15",
] as const;

/**
 * Ключ ISO-недели UTC для синхронизации «недельного» босса у всех игроков.
 */
export function currentRaidWeekKey(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function weekSalt(weekKey: string): number {
  let h = 0;
  for (let i = 0; i < weekKey.length; i++) {
    h = (Math.imul(31, h) + weekKey.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Общий множитель здоровья и ударов босса (HP, ATK, DEF). */
export const RAID_BOSS_POWER_MULT = 1.35;

/**
 * Недельный босс: цель баланса — средняя колода из редких+ карт иногда побеждает,
 * «вся common» почти никогда, сильная легендарно-смешанная — в большинстве недель.
 * См. `lib/raid/balanceSim.test.ts`.
 */
export function raidBossForWeek(weekKey: string): RaidBossStats {
  const salt = weekSalt(weekKey);
  const nameKey = BOSS_NAME_KEYS[salt % BOSS_NAME_KEYS.length]!;
  /** Масштаб недели: небольшой разброс сложности между неделями. */
  const tier = 1 + (salt % 5) * 0.035;
  const m = RAID_BOSS_POWER_MULT;
  const maxHp = Math.round(2080 * tier * m);
  const atk = Math.round(58 * tier * m);
  const def = Math.round(56 * tier * m);
  return { weekKey, nameKey, maxHp, atk, def };
}

export function currentRaidBoss(): RaidBossStats {
  return raidBossForWeek(currentRaidWeekKey());
}
