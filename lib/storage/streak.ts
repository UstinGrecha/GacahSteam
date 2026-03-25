import { DAILY_LOGIN_COINS } from "@/lib/economy/constants";
import type { StoredState } from "./types";

export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevLocalDay(day: string): string {
  const [y, mo, da] = day.split("-").map(Number);
  const dt = new Date(y, mo - 1, da - 1);
  return localDay(dt);
}

/** Mutates and returns same state for chaining. */
export function applyLoginStreak(state: StoredState): StoredState {
  const today = localDay();
  if (state.lastLoginDay === today) {
    if (state.daily.date !== today) {
      state.daily = { date: today, freePacksUsed: 0, packsOpenedToday: 0 };
    }
    return state;
  }
  state.daily = { date: today, freePacksUsed: 0, packsOpenedToday: 0 };
  state.coins += DAILY_LOGIN_COINS;
  if (state.lastLoginDay === prevLocalDay(today)) {
    state.loginStreak = (state.loginStreak ?? 0) + 1;
  } else {
    state.loginStreak = 1;
  }
  state.lastLoginDay = today;
  return state;
}
