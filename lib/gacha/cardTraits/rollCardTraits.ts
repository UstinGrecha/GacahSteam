import { CARD_TRAIT_CATALOG } from "./catalog";
import type { CardTraitRoll } from "./types";
import type { Rarity } from "@/lib/gacha/types";

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Детерминированный PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RARITY_TRAIT_COUNT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1,
  rare: 2,
  epic: 2,
  holo: 3,
  legend: 3,
  champion: 4,
};

/** Диапазон силы свойства (целые проценты), выше у редких карт. */
function potencyRange(rarity: Rarity): [number, number] {
  switch (rarity) {
    case "common":
      return [8, 18];
    case "uncommon":
      return [10, 20];
    case "rare":
      return [12, 24];
    case "epic":
      return [15, 28];
    case "holo":
      return [18, 32];
    case "legend":
      return [22, 38];
    case "champion":
      return [26, 44];
    default:
      return [8, 18];
  }
}

/**
 * Набор свойств для карты: стабильно от appid + редкости (те же карты = те же трейты).
 */
export function rollCardTraitsForCard(appid: number, rarity: Rarity): CardTraitRoll[] {
  const n = CARD_TRAIT_CATALOG.length;
  const k = Math.min(RARITY_TRAIT_COUNT[rarity], n);
  const seed = fnv1a32(`${appid}:${rarity}`);
  const rng = mulberry32(seed);

  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }

  const [pLo, pHi] = potencyRange(rarity);
  const span = Math.max(1, pHi - pLo + 1);
  const out: CardTraitRoll[] = [];
  for (let t = 0; t < k; t++) {
    const def = CARD_TRAIT_CATALOG[idx[t]!];
    if (!def) break;
    const potency = pLo + Math.floor(rng() * span);
    out.push({ id: def.id, potency });
  }
  return out;
}
