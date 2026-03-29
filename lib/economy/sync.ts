import {
  FREE_PACKS_PER_DAY,
  HOURLY_PACK_CATCH_UP_HOURS,
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

/** Верхняя граница почасового банка: дневной остаток + банк ≤ FREE_PACKS_PER_DAY. */
function maxHourlyBankForUsed(freePacksUsed: number): number {
  const dailyLeft = Math.max(0, FREE_PACKS_PER_DAY - freePacksUsed);
  return Math.max(0, FREE_PACKS_PER_DAY - dailyLeft);
}

/** Сброс дня, +1 стандартный пак в банк за каждый полный час (суммарно с дневным остатком не больше 8). */
export function economySync(state: StoredState): void {
  const today = localDay();
  if (state.daily.date !== today) {
    state.daily.date = today;
    state.daily.freePacksUsed = 0;
    state.daily.packsOpenedToday = 0;
  }
  if (!state.hourly) {
    state.hourly = { lastHourIndex: monotonicLocalHourIndex(), bank: 0 };
  }
  const used =
    state.daily.date === today ? state.daily.freePacksUsed : 0;
  const cap = maxHourlyBankForUsed(used);

  const nowIdx = monotonicLocalHourIndex();
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

export function getFreeStandardOpensAfterSync(state: StoredState): number {
  const today = localDay();
  const used =
    state.daily.date === today ? state.daily.freePacksUsed : 0;
  const dailyLeft = Math.max(0, FREE_PACKS_PER_DAY - used);
  return dailyLeft + (state.hourly?.bank ?? 0);
}

/** Сначала дневные 8, затем почасовой банк. */
export function consumeStandardFreePack(state: StoredState): void {
  if (state.daily.freePacksUsed < FREE_PACKS_PER_DAY) {
    state.daily.freePacksUsed += 1;
  } else if (state.hourly && state.hourly.bank > 0) {
    state.hourly.bank -= 1;
  }
}
