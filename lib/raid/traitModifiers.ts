import type { SteamCard } from "@/lib/gacha/types";

/** Свойства, дающие бонус к урону по боссу в рейде (условные «атакующие» пассивки). */
const RAID_OFFENSE_TRAIT_IDS = new Set([
  "t004",
  "t016",
  "t017",
  "t019",
  "t020",
  "t022",
  "t029",
  "t031",
  "t046",
  "t048",
  "t049",
  "t063",
  "t088",
  "t089",
  "t090",
]);

/** Снижают получаемый от босса урон. */
const RAID_DEFENSE_TRAIT_IDS = new Set([
  "t003",
  "t011",
  "t035",
  "t036",
  "t059",
  "t064",
  "t077",
]);

const BOSS_ENRAGE_HP_RATIO = 0.28;

export function isBossEnraged(bossHp: number, bossMaxHp: number): boolean {
  if (bossMaxHp <= 0) return false;
  return bossHp / bossMaxHp <= BOSS_ENRAGE_HP_RATIO;
}

export function bossEnrageDamageMult(bossHp: number, bossMaxHp: number): number {
  return isBossEnraged(bossHp, bossMaxHp) ? 1.22 : 1;
}

/** Множитель исходящего урона карты (макс. ~+28%). */
export function raidOutgoingDamageMult(card: SteamCard): number {
  let m = 1;
  for (const tr of card.traits ?? []) {
    if (RAID_OFFENSE_TRAIT_IDS.has(tr.id)) {
      m += tr.potency / 450;
    }
  }
  return Math.min(1.28, m);
}

/** Множитель входящего от босса урона (чем ниже, тем танковее). */
export function raidIncomingDamageMult(card: SteamCard): number {
  let m = 1;
  for (const tr of card.traits ?? []) {
    if (RAID_DEFENSE_TRAIT_IDS.has(tr.id)) {
      m -= tr.potency / 650;
    }
  }
  return Math.max(0.72, m);
}

/** Вампиризм t001: лечение после удара по боссу. */
export function raidLifestealHeal(card: SteamCard, damageDealt: number): number {
  const tr = card.traits?.find((x) => x.id === "t001");
  if (!tr || damageDealt <= 0) return 0;
  return Math.round(damageDealt * (tr.potency / 100));
}
