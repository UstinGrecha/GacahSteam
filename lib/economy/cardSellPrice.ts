import { rarityTier } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";

/** Базовые монеты по тиру редкости (common → legend). */
const BASE_COINS_BY_TIER = [4, 8, 14, 24, 38, 55, 72] as const;

const POWER_FACTOR = 0.1;
const MIN_SELL = 1;
/** Верхняя граница после деления на {@link SELL_PRICE_DIVISOR} (раньше эквивалент ~120 до скидки). */
const MAX_SELL = 48;
/** Стоимость продажи в 2.5 раза ниже «сырой» суммы база+статы. */
const SELL_PRICE_DIVISOR = 2.5;

/**
 * Цена продажи карты в монетах: база от редкости + доля от суммы статов (атк+защ+хП), затем ÷2.5.
 * Ориентир: бюджет-пак ~20, премиум ~40 — одна сильная легенда не должна стоить как десяток паков.
 */
export function cardSellCoins(card: SteamCard): number {
  const tier = rarityTier(card.rarity);
  const base = BASE_COINS_BY_TIER[tier] ?? BASE_COINS_BY_TIER[0]!;
  const power =
    (typeof card.atk === "number" && Number.isFinite(card.atk) ? card.atk : 0) +
    (typeof card.def === "number" && Number.isFinite(card.def) ? card.def : 0) +
    (typeof card.hp === "number" && Number.isFinite(card.hp) ? card.hp : 0);
  const fromStats = Math.floor(power * POWER_FACTOR);
  const raw = base + fromStats;
  const scaled = Math.floor(raw / SELL_PRICE_DIVISOR);
  return Math.min(MAX_SELL, Math.max(MIN_SELL, scaled));
}
