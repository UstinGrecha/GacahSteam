import { economySync, monotonicLocalHourIndex } from "@/lib/economy/sync";
import { normalizePullsCards } from "./persist";
import { localDay } from "./streak";
import type { StoredState } from "./types";

/** Валидация и нормализация импорта (версия 2). */
export function parseStoredStateJson(text: string): StoredState | null {
  try {
    const o = JSON.parse(text) as unknown;
    if (!o || typeof o !== "object") return null;
    const r = o as Partial<StoredState>;
    if (r.version !== 2 || !Array.isArray(r.pulls)) return null;
    const state: StoredState = {
      version: 2,
      pulls: r.pulls as StoredState["pulls"],
      achievements:
        r.achievements && typeof r.achievements === "object"
          ? { ...(r.achievements as StoredState["achievements"]) }
          : {},
      lastLoginDay:
        typeof r.lastLoginDay === "string" ? r.lastLoginDay : null,
      loginStreak:
        typeof r.loginStreak === "number" ? r.loginStreak : 0,
      coins: typeof r.coins === "number" ? r.coins : 0,
      daily:
        r.daily &&
        typeof r.daily.date === "string" &&
        r.daily.date &&
        typeof r.daily.freePacksUsed === "number"
          ? {
              date: r.daily.date,
              freePacksUsed: r.daily.freePacksUsed,
              packsOpenedToday:
                typeof r.daily.packsOpenedToday === "number"
                  ? r.daily.packsOpenedToday
                  : 0,
            }
          : { date: localDay(), freePacksUsed: 0, packsOpenedToday: 0 },
      hourly:
        r.hourly &&
        typeof r.hourly.lastHourIndex === "number" &&
        typeof r.hourly.bank === "number"
          ? { ...r.hourly }
          : { lastHourIndex: monotonicLocalHourIndex(), bank: 0 },
      pity:
        r.pity && typeof r.pity.packsSinceRarePlus === "number"
          ? { ...r.pity }
          : { packsSinceRarePlus: 0 },
      dust: typeof r.dust === "number" ? r.dust : 0,
      spareCopies:
        r.spareCopies && typeof r.spareCopies === "object"
          ? { ...r.spareCopies }
          : {},
      pityActivations:
        typeof r.pityActivations === "number" ? r.pityActivations : 0,
      salvageCount:
        typeof r.salvageCount === "number" ? r.salvageCount : 0,
      raid:
        r.raid &&
        typeof r.raid === "object" &&
        (typeof r.raid.lastRewardWeekKey === "string" ||
          r.raid.lastRewardWeekKey === null)
          ? { lastRewardWeekKey: r.raid.lastRewardWeekKey }
          : { lastRewardWeekKey: null },
    };
    normalizePullsCards(state);
    economySync(state);
    return state;
  } catch {
    return null;
  }
}

export function serializeStoredState(state: StoredState): string {
  return JSON.stringify(state, null, 2);
}
