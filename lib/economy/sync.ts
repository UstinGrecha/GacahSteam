import {
  FREE_PACKS_PER_DAY,
  HOURLY_PACK_CATCH_UP_HOURS,
  HOURLY_PACK_MAX_BANK,
  PACK_OPENS_DAILY_CAP,
} from "@/lib/economy/constants";
import { localDay } from "@/lib/storage/streak";
import type { StoredState } from "@/lib/storage/types";

/** Монотонный индекс локального календарного часа (+1 каждый локальный час). */
export function monotonicLocalHourIndex(d = new Date()): number {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const h = d.getHours();
  return Math.floor(new Date(y, m, day, h, 0, 0, 0).getTime() / 3_600_000);
}

/** Сброс дня, начисление почасовых паков в банк, правка lastHourIndex. */
export function economySync(state: StoredState): void {
  const today = localDay();
  if (state.daily.date !== today) {
    state.daily.date = today;
    state.daily.freePacksUsed = 0;
    state.daily.packsOpenedToday = 0;
  }
  if (!state.hourly) {
    state.hourly = { lastHourIndex: monotonicLocalHourIndex(), bank: 0 };
    return;
  }
  const nowIdx = monotonicLocalHourIndex();
  const delta = Math.max(
    0,
    Math.min(nowIdx - state.hourly.lastHourIndex, HOURLY_PACK_CATCH_UP_HOURS),
  );
  if (delta > 0) {
    state.hourly.bank = Math.min(
      state.hourly.bank + delta,
      HOURLY_PACK_MAX_BANK,
    );
    state.hourly.lastHourIndex = nowIdx;
  }
}

export function getFreeStandardOpensAfterSync(state: StoredState): number {
  const used =
    state.daily.date === localDay() ? state.daily.freePacksUsed : 0;
  const dailyLeft = Math.max(0, FREE_PACKS_PER_DAY - used);
  return dailyLeft + (state.hourly?.bank ?? 0);
}

export function isAtPackOpensDailyCap(state: StoredState): boolean {
  if (state.daily.date !== localDay()) return false;
  return state.daily.packsOpenedToday >= PACK_OPENS_DAILY_CAP;
}

/** Списать одну бесплатную стандартную попытку (сначала дневной лимит, затем банк часов). */
export function consumeStandardFreePack(state: StoredState): void {
  if (state.daily.freePacksUsed < FREE_PACKS_PER_DAY) {
    state.daily.freePacksUsed += 1;
  } else if (state.hourly && state.hourly.bank > 0) {
    state.hourly.bank -= 1;
  }
}
