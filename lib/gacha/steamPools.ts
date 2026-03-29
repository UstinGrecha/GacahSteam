import steamAppIds from "@/data/steam-app-ids.json";

const ALL = steamAppIds as number[];

/**
 * Крупнейшие хиты каталога (масса пользовательских отзывов Steam) — без них в
 * срезе «первые N appid» часто нет strict-редкости legend при открытии пака.
 */
export const SERIES_1_ANCHOR_APPIDS: readonly number[] = [
  730, 570, 578080, 440, 271590,
];

/** Игр в открываемой сейчас серии 1. */
export const SERIES_1_POOL_SIZE = 10_000;
/** Игр в серии 2 (следующий срез того же файла, когда паки включат). */
export const SERIES_2_POOL_SIZE = 5_000;

export type CardSeries = 1 | 2;

const anchorSet = new Set<number>(SERIES_1_ANCHOR_APPIDS);
const series1Rest = ALL.filter((id) => !anchorSet.has(id));
export const POOL_SERIES_1 = [
  ...SERIES_1_ANCHOR_APPIDS,
  ...series1Rest.slice(0, SERIES_1_POOL_SIZE - SERIES_1_ANCHOR_APPIDS.length),
];
export const POOL_SERIES_2 = ALL.slice(
  SERIES_1_POOL_SIZE,
  SERIES_1_POOL_SIZE + SERIES_2_POOL_SIZE,
);

/** Серия 2: паки в UI не открываются (кнопка «скоро»); сервер тоже отклоняет. */
export function isSeriesPacksAvailable(series: CardSeries): boolean {
  return series === 1;
}

export function poolForSeries(series: CardSeries): number[] {
  return series === 1 ? POOL_SERIES_1 : POOL_SERIES_2;
}
