import type { AppMetrics } from "@/lib/gacha/types";
import type { SteamAppDetailsData } from "./types";

export function isValidGameApp(data: SteamAppDetailsData): boolean {
  return data.type === "game" && Boolean(data.name?.trim());
}

/** Маппинг Steam review_score (1–9) → примерный % (как в старом клиенте Steam). */
const REVIEW_SCORE_TO_PERCENT: Record<number, number> = {
  1: 20,
  2: 35,
  3: 45,
  4: 55,
  5: 65,
  6: 74,
  7: 82,
  8: 89,
  9: 94,
};

function coercedRecommendationTotal(data: SteamAppDetailsData): number {
  const raw = data.recommendations?.total;
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string") {
    const n = Number.parseInt(raw.replace(/,/g, "").trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** Steam кладёт в `reviews` HTML; убираем теги, чтобы regex видел числа. */
function flattenReviewsSnippet(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|\u00a0/gi, " ")
    .replace(/,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Число пользовательских отзывов: `recommendations.total` (в т.ч. строка) или текст/HTML `reviews`.
 * Не полагаемся на `review_score` без счётчика.
 */
export function parseSteamUserReviewCount(
  data: SteamAppDetailsData,
): number {
  const fromApi = coercedRecommendationTotal(data);
  if (fromApi > 0) return fromApi;

  const s = flattenReviewsSnippet(data.reviews);
  if (!s) return 0;

  const patterns: RegExp[] = [
    /of\s+the\s+([\d,]+)\s+user\s+reviews?\b/i,
    /of\s+([\d,]+)\s+user\s+reviews?\b/i,
    /of\s+([\d,]+)\s+review/i,
    /\(([\d,]+)\s+reviews?\)/i,
    /\b([\d,]+)\s+user\s+reviews?\b/i,
    /\b([\d,]+)\s+reviews?\s+for\s+this\s+game\b/i,
    /\b([\d,]+)\s+reviews?\b/i,
  ];

  let best = 0;
  for (const re of patterns) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const rg = new RegExp(re.source, flags);
    for (const m of s.matchAll(rg)) {
      const raw = m[1];
      if (!raw) continue;
      const n = Number.parseInt(raw.replace(/,/g, ""), 10);
      if (Number.isFinite(n) && n > best) best = n;
    }
  }
  return best;
}

/**
 * Игра уже вышла: не «coming soon» и дата релиза не в будущем.
 */
export function isSteamAppReleased(data: SteamAppDetailsData): boolean {
  const rd = data.release_date;
  if (!rd) return true;
  if (rd.coming_soon === true) return false;
  const raw = rd.date?.trim();
  if (!raw) return true;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return true;
  return t <= Date.now();
}

/**
 * Доля положительных из текста отзывов или review_score.
 * Без реальных сигналов — null (не подставляем выдуманные 72%).
 */
export function parseUserReviewPercent(
  data: SteamAppDetailsData,
): number | null {
  if (parseSteamUserReviewCount(data) <= 0) return null;
  const fromText = data.reviews?.match(/(\d+)\s*%/);
  if (fromText) {
    const n = Number(fromText[1]);
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
  }
  const rs = data.review_score;
  if (typeof rs === "number" && REVIEW_SCORE_TO_PERCENT[rs] != null) {
    return REVIEW_SCORE_TO_PERCENT[rs]!;
  }
  return null;
}

/** Есть ли у товара ненулевой объём пользовательских отзывов (Steam). */
export function hasSteamUserReviewSignal(data: SteamAppDetailsData): boolean {
  return parseSteamUserReviewCount(data) > 0;
}

function parseMetacritic(data: SteamAppDetailsData): number | null {
  const s = data.metacritic?.score;
  if (typeof s !== "number" || !Number.isFinite(s)) return null;
  return Math.min(100, Math.max(0, s));
}

function parsePriceUsd(data: SteamAppDetailsData): number {
  if (data.is_free) return 0;
  const cents = data.price_overview?.final;
  if (typeof cents !== "number" || !Number.isFinite(cents)) return 0;
  return cents / 100;
}

function parseReleaseMs(data: SteamAppDetailsData): number | null {
  const rd = data.release_date;
  if (!rd || rd.coming_soon) return null;
  const t = Date.parse(rd.date ?? "");
  return Number.isFinite(t) ? t : null;
}

/** Жанры из Store API (поле `genres`). */
export function parseGenreDescriptions(data: SteamAppDetailsData): string[] {
  const g = data.genres;
  if (!Array.isArray(g)) return [];
  return g
    .map((x) => (typeof x.description === "string" ? x.description.trim() : ""))
    .filter(Boolean);
}

export function steamDataToMetrics(data: SteamAppDetailsData): AppMetrics {
  const reviewCount = parseSteamUserReviewCount(data);
  const hasUserReviews = reviewCount > 0;
  const pct = parseUserReviewPercent(data);

  return {
    positivePercent: pct ?? 0,
    hasUserReviews,
    metacritic: parseMetacritic(data),
    priceFinalUsd: parsePriceUsd(data),
    reviewCount,
    shortDescriptionLength: (data.short_description ?? "").length,
    releaseDateMs: parseReleaseMs(data),
  };
}
