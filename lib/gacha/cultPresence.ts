import type { AppMetrics } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Индекс 0–100: насколько игра «культовая» для Steam (масса отзывов, MC, %, возраст, описание, цена).
 * База для числа score на карте; тир карты задаётся отдельно (жёсткие чекпоинты).
 */
export function computeCultPresenceScore(m: AppMetrics): number {
  const rc = Math.max(0, m.reviewCount);
  const logR = Math.log10(rc + 10);

  const mass = clamp((logR - 1) / 5.25, 0, 1);

  const mcN =
    m.metacritic != null
      ? clamp(m.metacritic, 0, 100) / 100
      : 0.5 + mass * 0.08;

  const hasPct = rc > 0 && m.positivePercent > 0;
  const revN = hasPct
    ? clamp(m.positivePercent, 0, 100) / 100
    : 0.28 + mass * 0.45;

  const desc = clamp(m.shortDescriptionLength / 950, 0, 1);
  const price = clamp(m.priceFinalUsd / 69.99, 0, 1);

  let ageN = 0.1;
  if (m.releaseDateMs != null) {
    const yrs = (Date.now() - m.releaseDateMs) / (365.25 * 24 * 3600 * 1000);
    ageN = clamp(yrs / 15, 0, 1);
  }

  const idx =
    mass * 36 +
    mcN * 20 +
    revN * 22 +
    desc * 9 +
    price * 5 +
    ageN * 8;

  return clamp(Math.round(idx), 0, 100);
}

/**
 * Полы по объёму отзывов: крупные хиты не опускаются ниже ожидаемой редкости.
 * 50k+ → как минимум супер-редкая (epic), 200k+ → HR, 400k+ → ультра.
 */
export function applyCultReviewMassFloors(score: number, reviewCount: number): number {
  const rc = Math.max(0, reviewCount);
  let s = score;
  if (rc >= 450_000) s = Math.max(s, 91);
  else if (rc >= 220_000) s = Math.max(s, 86);
  else if (rc >= 90_000) s = Math.max(s, 82);
  else if (rc >= 50_000) s = Math.max(s, 74);
  else if (rc >= 22_000) s = Math.max(s, 68);
  else if (rc >= 9_000) s = Math.max(s, 60);
  else if (rc >= 2_500) s = Math.max(s, 54);
  else if (rc >= 500) s = Math.max(s, 48);
  else if (rc >= 120) s = Math.max(s, 45);
  return clamp(s, 0, 100);
}

/** Итоговый score карты с бонусом пака / питти. */
export function finalizeCultScore(m: AppMetrics, bonus: number): number {
  return clamp(
    applyCultReviewMassFloors(computeCultPresenceScore(m), m.reviewCount) +
      bonus,
    0,
    100,
  );
}
