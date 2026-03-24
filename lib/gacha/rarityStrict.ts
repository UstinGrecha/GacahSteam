import { isSteamAppReleased } from "@/lib/steam/parse";
import type { SteamAppDetailsData } from "@/lib/steam/types";
import type { AppMetrics, Rarity } from "./types";
import { clamp, minRarityByTier } from "./stats";

export type StrictRarityContext = {
  comingSoon: boolean;
  unreleasedLowReviews: boolean;
};

/**
 * Жёсткая редкость: только дискретные чекпоинты по метрикам Steam.
 * Бонус пака на тир не влияет — как контроль: сначала «масса» (отзывы), потом «качество» (% / MC).
 */
export function strictContextFromSteamData(
  data: SteamAppDetailsData,
  metrics: AppMetrics,
): StrictRarityContext {
  return {
    comingSoon: data.release_date?.coming_soon === true,
    unreleasedLowReviews:
      !isSteamAppReleased(data) && metrics.reviewCount < 3_000,
  };
}

/** Ступени по объёму отзывов — без сглаживания и смешивания с ценой/возрастом. */
export function rarityFromReviewMassOnly(reviewCount: number): Rarity {
  const rc = Math.max(0, reviewCount);
  if (rc >= 400_000) return "legend";
  if (rc >= 125_000) return "holo";
  if (rc >= 38_000) return "epic";
  if (rc >= 7_000) return "rare";
  if (rc >= 280) return "uncommon";
  return "common";
}

/** Верхняя граница тира по «доверенному» сигналу качества (паспортный контроль). */
function qualityCheckpointCeiling(m: AppMetrics): Rarity {
  const rc = Math.max(0, m.reviewCount);
  if (m.hasUserReviews && rc > 0) {
    const p = clamp(m.positivePercent, 0, 100);
    if (p < 32) return "common";
    if (p < 44) return "uncommon";
    if (p < 54) return "rare";
    if (p < 63) return "epic";
    if (p < 71) return "holo";
    return "legend";
  }
  if (m.metacritic != null) {
    const mc = clamp(m.metacritic, 0, 100);
    if (mc < 46) return "rare";
    if (mc < 59) return "epic";
    if (mc < 71) return "holo";
    return "legend";
  }
  return "uncommon";
}

export function computeStrictRarity(
  m: AppMetrics,
  ctx: StrictRarityContext,
): Rarity {
  if (ctx.comingSoon || ctx.unreleasedLowReviews) return "common";
  const mass = rarityFromReviewMassOnly(m.reviewCount);
  const ceiling = qualityCheckpointCeiling(m);
  return minRarityByTier(mass, ceiling);
}

/** Для сохранений без даты релиза: те же правила, без флагов Store. */
export function computeStrictRarityForPersist(m: AppMetrics): Rarity {
  return computeStrictRarity(m, {
    comingSoon: false,
    unreleasedLowReviews: false,
  });
}
