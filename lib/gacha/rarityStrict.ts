import { isSteamAppReleased } from "@/lib/steam/parse";
import type { SteamAppDetailsData } from "@/lib/steam/types";
import type { AppMetrics, Rarity } from "./types";
import { clamp, rarityAtTierIndex, rarityTier } from "./stats";

export type StrictRarityContext = {
  comingSoon: boolean;
  unreleasedLowReviews: boolean;
};

/**
 * Редкость карты: только число отзывов Steam + возраст релиза.
 * % положительных и Metacritic на тир не влияют.
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

/**
 * Индекс тира 0…5 только по объёму отзывов.
 * Верхние тиры под реальный Steam-пул: «легенда» — сильные хиты (≈230k+ отзывов),
 * а не только 1M+, иначе в выборке из тысяч appid нет ни одной legend.
 */
export function rarityTierIndexFromReviews(reviewCount: number): number {
  const rc = Math.max(0, reviewCount);
  if (rc >= 230_000) return 5;
  if (rc >= 95_000) return 4;
  if (rc >= 55_000) return 3;
  if (rc >= 7_000) return 2;
  if (rc >= 280) return 1;
  return 0;
}

export function rarityFromReviewMassOnly(reviewCount: number): Rarity {
  return rarityAtTierIndex(rarityTierIndexFromReviews(reviewCount));
}

function yearsSinceReleaseMs(releaseDateMs: number | null): number | null {
  if (releaseDateMs == null || !Number.isFinite(releaseDateMs)) return null;
  const y =
    (Date.now() - releaseDateMs) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(y)) return null;
  return Math.max(0, y);
}

/**
 * Сдвиг тира от даты выхода (в связке с отзывами).
 * — Очень свежий релиз + мало отзывов: без «накрутки» редкости.
 * — Давно в продаже + заметная масса отзывов: классика каталога, +тир.
 * — Ранний хит (много отзывов в первый год): не штрафуем за молодость.
 */
function releaseAgeTierDelta(
  ageYears: number | null,
  reviewCount: number,
): number {
  const rc = Math.max(0, reviewCount);

  if (ageYears == null) {
    /** Нет даты: сильный хит чуть ниже порога legend может получить +1 (аналог «классики»). */
    return rc >= 200_000 && rc < 230_000 ? 1 : 0;
  }

  let d = 0;

  if (ageYears < 0.42 && rc < 500) d -= 1;
  if (ageYears < 0.25 && rc < 200) d -= 1;

  if (ageYears < 1 && rc >= 18_000) d += 1;

  if (ageYears >= 4 && rc >= 2_000) d += 1;
  if (ageYears >= 8 && rc >= 5_000) d += 1;
  if (ageYears >= 14 && rc >= 20_000) d += 1;

  /** Не даём возрасту поднять карту сразу на два верхних тира подряд. */
  return clamp(d, -2, 1);
}

export function computeStrictRarity(
  m: AppMetrics,
  ctx: StrictRarityContext,
): Rarity {
  if (ctx.comingSoon || ctx.unreleasedLowReviews) return "common";

  const base = rarityTierIndexFromReviews(m.reviewCount);
  const age = yearsSinceReleaseMs(m.releaseDateMs);
  const delta = releaseAgeTierDelta(age, m.reviewCount);
  /** `champion` не из Steam-строгости — только трофей рейда. */
  const capped = Math.min(base + delta, rarityTier("legend"));
  return rarityAtTierIndex(capped);
}

export function computeStrictRarityForPersist(m: AppMetrics): Rarity {
  return computeStrictRarity(m, {
    comingSoon: false,
    unreleasedLowReviews: false,
  });
}
