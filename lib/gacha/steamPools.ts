import steamAppIds from "@/data/steam-app-ids.json";

const ALL = steamAppIds as number[];

/** Размер одной серии (первая половина списка / вторая). */
export const SERIES_POOL_SIZE = 5000;

export type CardSeries = 1 | 2;

export const POOL_SERIES_1 = ALL.slice(0, SERIES_POOL_SIZE);
export const POOL_SERIES_2 = ALL.slice(SERIES_POOL_SIZE, SERIES_POOL_SIZE * 2);

/** Серия 2: паки в UI не открываются (кнопка «скоро»); сервер тоже отклоняет. */
export function isSeriesPacksAvailable(series: CardSeries): boolean {
  return series === 1;
}

export function poolForSeries(series: CardSeries): number[] {
  return series === 1 ? POOL_SERIES_1 : POOL_SERIES_2;
}
