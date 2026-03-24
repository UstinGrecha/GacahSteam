import type { SteamAppDetailsData } from "@/lib/steam/types";
import {
  isSteamAppReleased,
  isValidGameApp,
  parseGenreDescriptions,
  steamDataToMetrics,
} from "@/lib/steam/parse";
import { finalizeCultScore } from "./cultPresence";
import {
  computeStrictRarity,
  strictContextFromSteamData,
} from "./rarityStrict";
import { clamp, computeCombatStats, rarityScoreBounds } from "./stats";
import type { Rarity, SteamCard } from "./types";

/** Невышедшие игры — не выше common (порог uncommon 45). */
const UNRELEASED_SCORE_CAP = 44;

export type BuildCardOptions = {
  scoreBonus?: number;
};

export function buildSteamCard(
  appid: number,
  data: SteamAppDetailsData,
  opts?: BuildCardOptions,
): SteamCard | null {
  if (!isValidGameApp(data)) return null;
  const name = data.name!.trim();
  const metrics = steamDataToMetrics(data);
  const bonus = opts?.scoreBonus ?? 0;

  const rarity: Rarity = computeStrictRarity(
    metrics,
    strictContextFromSteamData(data, metrics),
  );

  let raw = finalizeCultScore(metrics, bonus);
  if (data.release_date?.coming_soon === true) {
    raw = Math.min(raw, UNRELEASED_SCORE_CAP);
  } else if (!isSteamAppReleased(data) && metrics.reviewCount < 3_000) {
    raw = Math.min(raw, UNRELEASED_SCORE_CAP);
  }
  const [tierLo, tierHi] = rarityScoreBounds(rarity);
  const score = clamp(raw, tierLo, tierHi);

  const { atk, def, hp } = computeCombatStats(score, metrics, rarity);
  const headerImage = data.header_image?.trim() || "";
  if (!headerImage) return null;
  const genres = parseGenreDescriptions(data);
  const reviewScoreDesc = (data.review_score_desc ?? "").trim() || null;

  return {
    appid,
    name,
    headerImage,
    storeUrl: `https://store.steampowered.com/app/${appid}/`,
    rarity,
    atk,
    def,
    hp,
    score,
    positivePercent: metrics.positivePercent,
    metacritic: metrics.metacritic,
    hasUserReviews: metrics.hasUserReviews,
    reviewCount: metrics.reviewCount,
    reviewScoreDesc,
    genres,
  };
}
