import type { Rarity, SteamCard } from "@/lib/gacha/types";

/**
 * Шанс редкости на один слот пака (5 независимых бросков).
 * Обычные и необычные — основная масса; holo/legend — редкие (holo ~0.4%, legend ~0.3% на слот).
 */
export const PACK_SLOT_RARITY_WEIGHTS: { rarity: Rarity; p: number }[] = [
  { rarity: "common", p: 0.728 },
  { rarity: "uncommon", p: 0.17 },
  { rarity: "rare", p: 0.07 },
  { rarity: "epic", p: 0.025 },
  { rarity: "holo", p: 0.004 },
  { rarity: "legend", p: 0.003 },
];

/** SR / UR / HR — множители к ATK/DEF/HP после сборки карты. */
const POWER_MULT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1,
  rare: 1,
  epic: 1.25,
  holo: 1.5,
  legend: 2,
  champion: 3,
};

/** Один бросок [0, 1) → редкость слота по таблице выше. */
export function rollWeightedPackRarity(rng: () => number): Rarity {
  const x = rng();
  let c = 0;
  for (const row of PACK_SLOT_RARITY_WEIGHTS) {
    c += row.p;
    if (x < c) return row.rarity;
  }
  return "common";
}

export function applyPackPowerMultiplier(card: SteamCard): SteamCard {
  const m = POWER_MULT[card.rarity];
  if (m === 1) return card;
  return {
    ...card,
    atk: Math.round(card.atk * m),
    def: Math.round(card.def * m),
    hp: Math.round(card.hp * m),
  };
}
