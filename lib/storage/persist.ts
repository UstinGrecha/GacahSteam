import {
  getCardTraitDef,
  rollCardTraitsForCard,
} from "@/lib/gacha/cardTraits";
import type { CardTraitRoll } from "@/lib/gacha/cardTraits/types";
import {
  isRaidBossRewardAppid,
  rollTrophyCombatStat,
  TROPHY_COMBAT_STAT_MAX,
  TROPHY_COMBAT_STAT_MIN,
} from "@/lib/gacha/raidReward";
import { computeStrictRarityForPersist } from "@/lib/gacha/rarityStrict";
import {
  clamp,
  computeCombatStats,
  computeScore,
  rarityScoreBounds,
} from "@/lib/gacha/stats";
import type { AppMetrics, SteamCard } from "@/lib/gacha/types";
import { economySync, monotonicLocalHourIndex } from "@/lib/economy/sync";
import { localDay } from "@/lib/storage/streak";
import { rebuildSpareCopiesFromPulls } from "./spareCopies";
import type { AchievementMap, StoredState, StoredStateV2 } from "./types";

const GUEST_KEY = "steamgacha:v2";
const KEY_LEGACY = "steamgacha:v1";

/** Sub из OAuth / email-сессии; null = гостевой слот (ключ steamgacha:v2). */
let persistedUserId: string | null = null;

export function setPersistUserScope(userId: string | null): void {
  persistedUserId = userId && userId.length > 0 ? userId : null;
}

function storageKey(): string {
  return persistedUserId
    ? `steamgacha:v2:u:${persistedUserId}`
    : GUEST_KEY;
}

/**
 * Если у аккаунта ещё нет сохранения, копирует гостевой прогресс из steamgacha:v2.
 */
export function migrateGuestSaveToUserIfNeeded(userId: string): void {
  if (typeof window === "undefined") return;
  const dest = `steamgacha:v2:u:${userId}`;
  if (localStorage.getItem(dest)) return;
  const guest = localStorage.getItem(GUEST_KEY);
  if (!guest) return;
  try {
    const o = JSON.parse(guest) as { pulls?: unknown[] };
    if (Array.isArray(o.pulls) && o.pulls.length > 0) {
      localStorage.setItem(dest, guest);
    }
  } catch {
    /* ignore */
  }
}

function normalizeStoredTraits(
  raw: unknown,
  appid: number,
  rarity: SteamCard["rarity"],
): CardTraitRoll[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return rollCardTraitsForCard(appid, rarity);
  }
  const out: CardTraitRoll[] = [];
  for (const row of raw) {
    if (out.length >= 4) break;
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const potencyRaw = typeof o.potency === "number" ? o.potency : Number(o.potency);
    if (!getCardTraitDef(id) || !Number.isFinite(potencyRaw)) continue;
    const potency = Math.round(Math.min(99, Math.max(1, potencyRaw)));
    out.push({ id, potency });
  }
  return out.length > 0 ? out : rollCardTraitsForCard(appid, rarity);
}

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
    traits?: unknown;
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
  const rarity: SteamCard["rarity"] =
    isRaidBossRewardAppid(base.appid)
      ? "champion"
      : computeStrictRarityForPersist(metrics);
  const [lo, hi] = rarityScoreBounds(rarity);
  const baseScore =
    rarity === "champion" &&
    typeof c.score === "number" &&
    Number.isFinite(c.score)
      ? c.score
      : computeScore(metrics);
  const score = clamp(baseScore, lo, hi);
  let atk: number;
  let def: number;
  let hp: number;
  if (rarity === "champion") {
    const inRange = (n: unknown): n is number =>
      typeof n === "number" &&
      Number.isFinite(n) &&
      n >= TROPHY_COMBAT_STAT_MIN &&
      n <= TROPHY_COMBAT_STAT_MAX;
    if (inRange(c.atk) && inRange(c.def) && inRange(c.hp)) {
      atk = Math.round(c.atk);
      def = Math.round(c.def);
      hp = Math.round(c.hp);
    } else {
      atk = rollTrophyCombatStat();
      def = rollTrophyCombatStat();
      hp = rollTrophyCombatStat();
    }
  } else {
    const s = computeCombatStats(score, metrics, rarity);
    atk = s.atk;
    def = s.def;
    hp = s.hp;
  }

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
    traits: normalizeStoredTraits(raw.traits, base.appid, rarity),
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
    daily: { date: localDay(), freePacksUsed: 0, packsOpenedToday: 0 },
    hourly: { lastHourIndex: monotonicLocalHourIndex(), bank: 0 },
    pity: { packsSinceRarePlus: 0 },
    dust: 0,
    spareCopies: {},
    pityActivations: 0,
    salvageCount: 0,
    raid: { lastRewardWeekKey: null },
  };
}

/**
 * Снимок из API/БД без economySync (день/часы считаются на сервере по UTC или локально у гостя).
 */
export function hydrateStoredStateFromApi(raw: unknown): StoredState {
  if (!raw || typeof raw !== "object") return defaultState();
  const o = raw as Partial<StoredStateV2>;
  if (o.version === 2 && Array.isArray(o.pulls)) return parseStoredStateRecord(o);
  return defaultState();
}

function parseStoredStateRecord(raw: Partial<StoredStateV2>): StoredState {
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
        ? {
            date: raw.daily.date,
            freePacksUsed: raw.daily.freePacksUsed,
            packsOpenedToday:
              typeof raw.daily.packsOpenedToday === "number"
                ? raw.daily.packsOpenedToday
                : 0,
          }
        : { date: localDay(), freePacksUsed: 0, packsOpenedToday: 0 },
    hourly:
      raw.hourly &&
      typeof raw.hourly === "object" &&
      typeof raw.hourly.lastHourIndex === "number" &&
      typeof raw.hourly.bank === "number"
        ? { ...raw.hourly }
        : { lastHourIndex: monotonicLocalHourIndex(), bank: 0 },
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
    raid:
      raw.raid &&
      typeof raw.raid === "object" &&
      (typeof raw.raid.lastRewardWeekKey === "string" ||
        raw.raid.lastRewardWeekKey === null)
        ? { lastRewardWeekKey: raw.raid.lastRewardWeekKey }
        : { lastRewardWeekKey: null },
  };
  if (Object.keys(state.spareCopies).length === 0 && pulls.length > 0) {
    rebuildSpareCopiesFromPulls(state);
  }
  normalizePullsCards(state);
  return state;
}

function normalizeV2(raw: Partial<StoredStateV2>): StoredState {
  const state = parseStoredStateRecord(raw);
  economySync(state);
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
    daily: { date: localDay(), freePacksUsed: 0, packsOpenedToday: 0 },
    hourly: { lastHourIndex: monotonicLocalHourIndex(), bank: 0 },
    pity: { packsSinceRarePlus: 0 },
    dust: 0,
    spareCopies: {},
    pityActivations: 0,
    salvageCount: 0,
    raid: { lastRewardWeekKey: null },
  };
  rebuildSpareCopiesFromPulls(state);
  normalizePullsCards(state);
  economySync(state);
  return state;
}

export function loadState(): StoredState {
  if (typeof window === "undefined") return defaultState();
  const key = storageKey();
  try {
    const rawV2 = localStorage.getItem(key);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<StoredStateV2>;
      if (parsed.version === 2 && Array.isArray(parsed.pulls)) {
        return normalizeV2(parsed);
      }
    }

    const rawLegacy = localStorage.getItem(KEY_LEGACY);
    if (rawLegacy && key === GUEST_KEY) {
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
          localStorage.setItem(GUEST_KEY, JSON.stringify(migrated));
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
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

/** Removes game save keys from localStorage (locale preference is kept). */
export function clearPersistedGameState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey());
    if (!persistedUserId) localStorage.removeItem(KEY_LEGACY);
  } catch {
    /* ignore */
  }
}
