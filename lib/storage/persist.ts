import { computeStrictRarityForPersist } from "@/lib/gacha/rarityStrict";
import {
  clamp,
  computeCombatStats,
  computeScore,
  rarityScoreBounds,
} from "@/lib/gacha/stats";
import type { AppMetrics, SteamCard } from "@/lib/gacha/types";
import { localDay } from "@/lib/storage/streak";
import { rebuildSpareCopiesFromPulls } from "./spareCopies";
import type { AchievementMap, StoredState, StoredStateV2 } from "./types";

const KEY = "steamgacha:v2";
const KEY_LEGACY = "steamgacha:v1";

function cardToMetrics(c: SteamCard): AppMetrics {
  const rc = c.reviewCount < 0 ? 0 : Math.max(0, Math.floor(c.reviewCount));
  const rd =
    typeof c.releaseDateMs === "number" && Number.isFinite(c.releaseDateMs)
      ? c.releaseDateMs
      : null;
  return {
    positivePercent: c.positivePercent,
    hasUserReviews: Boolean(c.hasUserReviews && rc > 0),
    metacritic: c.metacritic,
    priceFinalUsd: 0,
    reviewCount: rc,
    shortDescriptionLength: 220,
    releaseDateMs: rd,
  };
}

function normalizeSteamCard(c: SteamCard): SteamCard {
  const raw = c as SteamCard & {
    hasUserReviews?: boolean;
    reviewCount?: number;
    reviewScoreDesc?: string | null;
    releaseDateMs?: number | null;
  };
  const hasNewReviewFields =
    typeof raw.hasUserReviews === "boolean" &&
    typeof raw.reviewCount === "number";

  let hasUserReviews: boolean;
  let reviewCount: number;

  if (!hasNewReviewFields) {
    hasUserReviews = false;
    reviewCount = -1;
  } else {
    reviewCount = Math.trunc(raw.reviewCount);
    hasUserReviews = reviewCount > 0;
  }

  const releaseDateMs =
    typeof raw.releaseDateMs === "number" && Number.isFinite(raw.releaseDateMs)
      ? raw.releaseDateMs
      : null;

  const base: SteamCard = {
    ...c,
    hasUserReviews,
    reviewCount,
    releaseDateMs,
  };

  const metrics = cardToMetrics(base);
  const rarity = computeStrictRarityForPersist(metrics);
  const [lo, hi] = rarityScoreBounds(rarity);
  const score = clamp(computeScore(metrics), lo, hi);
  const { atk, def, hp } = computeCombatStats(score, metrics, rarity);

  return {
    ...base,
    score,
    rarity,
    atk,
    def,
    hp,
    genres: Array.isArray(c.genres) ? c.genres : [],
    reviewScoreDesc:
      typeof raw.reviewScoreDesc === "string" &&
      raw.reviewScoreDesc.trim() !== ""
        ? raw.reviewScoreDesc.trim()
        : null,
  };
}

export function normalizePullsCards(state: StoredState): void {
  state.pulls = state.pulls.map((p) => ({
    ...p,
    cards: p.cards.map(normalizeSteamCard),
  }));
}

export function defaultState(): StoredState {
  return {
    version: 2,
    pulls: [],
    achievements: {},
    lastLoginDay: null,
    loginStreak: 0,
    coins: 0,
    daily: { date: localDay(), freePacksUsed: 0 },
    pity: { packsSinceRarePlus: 0 },
    dust: 0,
    spareCopies: {},
    pityActivations: 0,
    salvageCount: 0,
  };
}

function normalizeV2(raw: Partial<StoredStateV2>): StoredState {
  const pulls = Array.isArray(raw.pulls) ? raw.pulls : [];
  const achievements =
    raw.achievements && typeof raw.achievements === "object"
      ? (raw.achievements as AchievementMap)
      : {};
  const state: StoredState = {
    version: 2,
    pulls,
    achievements,
    lastLoginDay:
      typeof raw.lastLoginDay === "string" ? raw.lastLoginDay : null,
    loginStreak:
      typeof raw.loginStreak === "number" ? raw.loginStreak : 0,
    coins: typeof raw.coins === "number" && Number.isFinite(raw.coins) ? raw.coins : 0,
    daily:
      raw.daily &&
      typeof raw.daily === "object" &&
      typeof raw.daily.date === "string" &&
      typeof raw.daily.freePacksUsed === "number"
        ? { ...raw.daily }
        : { date: localDay(), freePacksUsed: 0 },
    pity:
      raw.pity &&
      typeof raw.pity.packsSinceRarePlus === "number"
        ? { packsSinceRarePlus: raw.pity.packsSinceRarePlus }
        : { packsSinceRarePlus: 0 },
    dust: typeof raw.dust === "number" && Number.isFinite(raw.dust) ? raw.dust : 0,
    spareCopies:
      raw.spareCopies && typeof raw.spareCopies === "object"
        ? { ...raw.spareCopies }
        : {},
    pityActivations:
      typeof raw.pityActivations === "number" ? raw.pityActivations : 0,
    salvageCount:
      typeof raw.salvageCount === "number" ? raw.salvageCount : 0,
  };
  if (Object.keys(state.spareCopies).length === 0 && pulls.length > 0) {
    rebuildSpareCopiesFromPulls(state);
  }
  normalizePullsCards(state);
  return state;
}

function migrateFromV1(parsed: {
  pulls?: StoredState["pulls"];
  achievements?: AchievementMap;
  lastLoginDay?: string | null;
  loginStreak?: number;
}): StoredState {
  const pulls = Array.isArray(parsed.pulls) ? parsed.pulls : [];
  const rawAch = parsed.achievements;
  const achievements: StoredState["achievements"] =
    rawAch && typeof rawAch === "object" ? { ...rawAch } : {};
  for (const id of Object.keys(achievements)) {
    const e = achievements[id];
    if (e) {
      achievements[id] = {
        ...e,
        coinRewardClaimed: e.coinRewardClaimed ?? false,
      };
    }
  }
  const state: StoredState = {
    version: 2,
    pulls,
    achievements,
    lastLoginDay:
      typeof parsed.lastLoginDay === "string" ? parsed.lastLoginDay : null,
    loginStreak:
      typeof parsed.loginStreak === "number" ? parsed.loginStreak : 0,
    coins: 0,
    daily: { date: localDay(), freePacksUsed: 0 },
    pity: { packsSinceRarePlus: 0 },
    dust: 0,
    spareCopies: {},
    pityActivations: 0,
    salvageCount: 0,
  };
  rebuildSpareCopiesFromPulls(state);
  normalizePullsCards(state);
  return state;
}

export function loadState(): StoredState {
  if (typeof window === "undefined") return defaultState();
  try {
    const rawV2 = localStorage.getItem(KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<StoredStateV2>;
      if (parsed.version === 2 && Array.isArray(parsed.pulls)) {
        return normalizeV2(parsed);
      }
    }

    const rawLegacy = localStorage.getItem(KEY_LEGACY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy) as {
        version?: number;
        pulls?: StoredState["pulls"];
        achievements?: AchievementMap;
        lastLoginDay?: string | null;
        loginStreak?: number;
      };
      if (parsed.version === 1 && Array.isArray(parsed.pulls)) {
        const migrated = migrateFromV1(parsed);
        try {
          localStorage.setItem(KEY, JSON.stringify(migrated));
          localStorage.removeItem(KEY_LEGACY);
        } catch {
          /* ignore */
        }
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultState();
}

export function saveState(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

/** Removes game save keys from localStorage (locale preference is kept). */
export function clearPersistedGameState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_LEGACY);
  } catch {
    /* ignore */
  }
}
