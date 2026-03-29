import type { AppMetrics, Rarity } from "./types";
import {
  applyCultReviewMassFloors,
  computeCultPresenceScore,
} from "./cultPresence";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Полосы score 0–100 на карте (культ ± бонус пака режется в границы тира). */
const T_UNCOMMON = 45;
const T_RARE = 57;
const T_EPIC = 72;
const T_HOLO = 80;
const T_LEGEND = 88;
const T_CHAMPION = 94;

const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "holo",
  "legend",
  "champion",
];

export function rarityTier(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

/** Более низкий тир из двух. */
export function minRarityByTier(a: Rarity, b: Rarity): Rarity {
  return RARITY_ORDER[Math.min(rarityTier(a), rarityTier(b))];
}

/** На шаг ниже по лестнице редкости; с common — null. */
export function rarityOneStepDown(r: Rarity): Rarity | null {
  const i = rarityTier(r);
  if (i <= 0) return null;
  return RARITY_ORDER[i - 1]!;
}

/** Индекс тира 0…5 → редкость (для лестницы отзывов + возраст релиза). */
export function rarityAtTierIndex(idx: number): Rarity {
  const j = clamp(Math.round(idx), 0, RARITY_ORDER.length - 1);
  return RARITY_ORDER[j]!;
}

export function rarityScoreBounds(r: Rarity): [number, number] {
  const bands: Record<Rarity, [number, number]> = {
    common: [0, T_UNCOMMON - 1],
    uncommon: [T_UNCOMMON, T_RARE - 1],
    rare: [T_RARE, T_EPIC - 1],
    epic: [T_EPIC, T_HOLO - 1],
    holo: [T_HOLO, T_LEGEND - 1],
    legend: [T_LEGEND, T_CHAMPION - 1],
    champion: [T_CHAMPION, 100],
  };
  return bands[r];
}

/** Score 0–100 для статов и UI: «культовость» Steam + полы по массе отзывов. */
export function computeScore(m: AppMetrics): number {
  return applyCultReviewMassFloors(computeCultPresenceScore(m), m.reviewCount);
}

/** Маппинг числа на тир (нормализация сохранений, тесты). Редкость карты — отзывы + дата релиза (rarityStrict). */
export function scoreToRarity(score: number): Rarity {
  if (score >= T_CHAMPION) return "champion";
  if (score >= T_LEGEND) return "legend";
  if (score >= T_HOLO) return "holo";
  if (score >= T_EPIC) return "epic";
  if (score >= T_RARE) return "rare";
  if (score >= T_UNCOMMON) return "uncommon";
  return "common";
}

/** Случайный score внутри полосы тира (отладка, визуальные тесты). */
export function randomScoreInRarityBand(rarity: Rarity, rng: () => number): number {
  const [lo, hi] = rarityScoreBounds(rarity);
  const t = lo + rng() * (hi - lo);
  return Math.round(clamp(t, lo, hi));
}

/** rare и выше */
export function isRarePlus(r: Rarity): boolean {
  return rarityTier(r) >= 2;
}

export function computeAtkDef(
  score: number,
  m: AppMetrics,
): { atk: number; def: number } {
  const reviewFlavor = m.hasUserReviews
    ? m.positivePercent
    : (m.metacritic ?? 48);
  const atk = Math.round(
    12 + score * 1.08 + (reviewFlavor / 100) * 38,
  );
  const metaPart = m.metacritic ?? reviewFlavor * 0.85;
  const def = Math.round(
    12 +
      clamp(m.shortDescriptionLength / 22, 0, 85) +
      metaPart * 0.42 +
      Math.min(18, Math.log10(m.reviewCount + 10) * 6),
  );
  return {
    atk: clamp(atk, 10, 150),
    def: clamp(def, 10, 150),
  };
}

/** Плоские бонусы к базовым статам от редкости (база — Steam-метрики). */
const RARITY_ATK_BONUS: Record<Rarity, number> = {
  common: 0,
  uncommon: 5,
  rare: 11,
  epic: 19,
  holo: 25,
  legend: 30,
  champion: 38,
};

const RARITY_DEF_BONUS: Record<Rarity, number> = {
  common: 0,
  uncommon: 4,
  rare: 9,
  epic: 16,
  holo: 22,
  legend: 26,
  champion: 32,
};

/** HP из итоговых атаки/защиты и score (после бонусов редкости). */
export function computeCardHp(atk: number, def: number, score: number): number {
  return clamp(
    Math.round(28 + atk * 0.56 + def * 0.68 + score * 0.78),
    48,
    320,
  );
}

/** ATK (урон), DEF (защита), HP — база из Store + явные бонусы редкости. */
export function computeCombatStats(
  score: number,
  m: AppMetrics,
  rarity: Rarity,
): { atk: number; def: number; hp: number } {
  const base = computeAtkDef(score, m);
  const atk = clamp(
    Math.round(base.atk + RARITY_ATK_BONUS[rarity]),
    12,
    200,
  );
  const def = clamp(
    Math.round(base.def + RARITY_DEF_BONUS[rarity]),
    12,
    200,
  );
  const hp = computeCardHp(atk, def, score);
  return { atk, def, hp };
}

/** Множитель «слабости» на карте (чем выше редкость — тем жёстче штраф). */
export function combatWeaknessMultiplier(rarity: Rarity): number {
  const t = rarityTier(rarity);
  return 2 + Math.min(2, Math.floor(t / 2));
}

/** Сопротивление урону (0–40) от защиты и редкости. */
export function combatResistValue(
  def: number,
  rarity: Rarity,
): number {
  const t = rarityTier(rarity);
  return Math.min(40, 6 + Math.round(def * 0.14) + t * 3);
}

/** Стоимость отступа (число «энергий»): чем выше редкость, тем дороже отход. */
export function combatRetreatCost(rarity: Rarity): number {
  return clamp(1 + rarityTier(rarity), 1, 4);
}
