import { rollCardTraitsForCard } from "@/lib/gacha/cardTraits";
import { clamp, rarityScoreBounds } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";

/** Нижняя и верхняя граница случайных ATK/DEF/HP у трофейных (рейд) карт. */
export const TROPHY_COMBAT_STAT_MIN = 200;
export const TROPHY_COMBAT_STAT_MAX = 600;

/** Равномерно [TROPHY_COMBAT_STAT_MIN, TROPHY_COMBAT_STAT_MAX], браузер и Node. */
export function rollTrophyCombatStat(): number {
  const lo = TROPHY_COMBAT_STAT_MIN;
  const span = TROPHY_COMBAT_STAT_MAX - lo + 1;
  if (
    typeof globalThis.crypto !== "undefined" &&
    "getRandomValues" in globalThis.crypto
  ) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return lo + (buf[0]! % span);
  }
  return lo + Math.floor(Math.random() * span);
}

/**
 * Трофейные игры за победу над недельным рейд-боссом (не падают из паков).
 * Награда: случайная карта из этого списка (50/50 при двух id).
 */
export const RAID_BOSS_REWARD_APPIDS = [945360, 105600] as const;

/** Первый id в пуле наград (Among Us). Для обратной совместимости импортов. */
export const RAID_BOSS_REWARD_APPID = RAID_BOSS_REWARD_APPIDS[0];

/** Исключаются из случайной выборки SteamPoolEntry при открытии паков и перебросах. */
export const EXCLUDED_FROM_PACK_POOL_APPIDS: readonly number[] = [
  ...RAID_BOSS_REWARD_APPIDS,
];

const rewardAppidSet = new Set<number>(RAID_BOSS_REWARD_APPIDS);

export function isRaidBossRewardAppid(appid: number): boolean {
  return rewardAppidSet.has(appid);
}

const excludedSet = new Set(EXCLUDED_FROM_PACK_POOL_APPIDS);

export function isExcludedFromPackPool(appid: number): boolean {
  return excludedSet.has(appid);
}

/** Редкость «чемпион рейда»: выше UR, только награда за рейд. */
export function promoteToChampionRarity(card: SteamCard): SteamCard {
  const rarity = "champion";
  const [lo, hi] = rarityScoreBounds(rarity);
  const score = clamp(card.score, lo, hi);
  return {
    ...card,
    rarity,
    score,
    atk: rollTrophyCombatStat(),
    def: rollTrophyCombatStat(),
    hp: rollTrophyCombatStat(),
    traits: rollCardTraitsForCard(card.appid, rarity),
  };
}
