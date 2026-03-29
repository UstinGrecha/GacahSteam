import {
  DAILY_LOGIN_COINS,
  FREE_PACKS_PER_DAY,
  HOURLY_PACK_CATCH_UP_HOURS,
} from "@/lib/economy/constants";
import type { StoredState } from "@/lib/storage/types";

/** Календарный день по UTC (серверный авторитет для онлайн-сохранений). */
export function utcCalendarDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function prevUtcDay(day: string): string {
  const t = Date.parse(`${day}T12:00:00.000Z`);
  if (!Number.isFinite(t)) return day;
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function monotonicUtcHourIndex(d = new Date()): number {
  return Math.floor(d.getTime() / 3_600_000);
}

function maxHourlyBankForUsed(freePacksUsed: number): number {
  const dailyLeft = Math.max(0, FREE_PACKS_PER_DAY - freePacksUsed);
  return Math.max(0, FREE_PACKS_PER_DAY - dailyLeft);
}

/** Сброс дня по UTC, +1 пак в банк за час (суммарно с дневным остатком ≤ 8). */
export function economySyncUtc(state: StoredState): void {
  const today = utcCalendarDay();
  if (state.daily.date !== today) {
    state.daily.date = today;
    state.daily.freePacksUsed = 0;
    state.daily.packsOpenedToday = 0;
  }
  if (!state.hourly) {
    state.hourly = { lastHourIndex: monotonicUtcHourIndex(), bank: 0 };
  }
  const used =
    state.daily.date === today ? state.daily.freePacksUsed : 0;
  const cap = maxHourlyBankForUsed(used);

  const nowIdx = monotonicUtcHourIndex();
  const delta = Math.max(
    0,
    Math.min(nowIdx - state.hourly.lastHourIndex, HOURLY_PACK_CATCH_UP_HOURS),
  );
  if (delta > 0) {
    state.hourly.bank = Math.min(state.hourly.bank + delta, cap);
    state.hourly.lastHourIndex = nowIdx;
  }
  state.hourly.bank = Math.min(state.hourly.bank, cap);
}

export function getFreeStandardOpensAfterUtcSync(state: StoredState): number {
  const today = utcCalendarDay();
  const used =
    state.daily.date === today ? state.daily.freePacksUsed : 0;
  const dailyLeft = Math.max(0, FREE_PACKS_PER_DAY - used);
  return dailyLeft + (state.hourly?.bank ?? 0);
}

export function consumeStandardFreePackUtc(state: StoredState): void {
  if (state.daily.freePacksUsed < FREE_PACKS_PER_DAY) {
    state.daily.freePacksUsed += 1;
  } else if (state.hourly && state.hourly.bank > 0) {
    state.hourly.bank -= 1;
  }
}

/** Ежедневный бонус и стрик по UTC. */
export function applyLoginStreakUtc(state: StoredState): void {
  const today = utcCalendarDay();
  if (state.lastLoginDay === today) {
    if (state.daily.date !== today) {
      state.daily = { date: today, freePacksUsed: 0, packsOpenedToday: 0 };
    }
    return;
  }
  state.daily = { date: today, freePacksUsed: 0, packsOpenedToday: 0 };
  state.coins += DAILY_LOGIN_COINS;
  if (state.lastLoginDay === prevUtcDay(today)) {
    state.loginStreak = (state.loginStreak ?? 0) + 1;
  } else {
    state.loginStreak = 1;
  }
  state.lastLoginDay = today;
}
