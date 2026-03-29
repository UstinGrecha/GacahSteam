/**
 * Сервер: Prisma + SteamPoolEntry. Не импортировать из клиентских компонентов —
 * используйте `openPackBrowser.ts`.
 */
import type { CardSeries } from "@/lib/gacha/steamPools";
import type { PackKind } from "@/lib/gacha/packKinds";
import type { SteamCard } from "@/lib/gacha/types";
import {
  fetchOneNewCardFromDbPoolWithBatchPicker,
  openPackFromDbPoolWithBatchPicker,
  type OpenPackOptions,
  type OpenPackResult,
  type SteamDetailsFetcher,
} from "@/lib/gacha/openPackShared";
import {
  fetchSteamPoolResponseForIds,
  pickRandomSteamPoolAppIds,
} from "@/lib/steam/steamPoolDb";

export {
  OPEN_PACK_SIZE,
  parseDetailsToCards,
  type OpenPackOptions,
  type OpenPackResult,
  type SteamDetailsFetcher,
} from "@/lib/gacha/openPackShared";

export async function openPackFromDbPoolWithFetcher(
  series: CardSeries,
  rng: () => number,
  fetcher: SteamDetailsFetcher,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  return openPackFromDbPoolWithBatchPicker(
    rng,
    (tried, batchSize) =>
      pickRandomSteamPoolAppIds(series, tried, batchSize),
    fetcher,
    options,
  );
}

export async function openPackFromDbPool(
  series: CardSeries,
  rng: () => number,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  return openPackFromDbPoolWithFetcher(
    series,
    rng,
    (ids) => fetchSteamPoolResponseForIds(ids, series),
    options,
  );
}

export async function fetchOneNewCardFromDbPoolWithFetcher(
  series: CardSeries,
  rng: () => number,
  fetcher: SteamDetailsFetcher,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  return fetchOneNewCardFromDbPoolWithBatchPicker(
    rng,
    (tried, batchSize) =>
      pickRandomSteamPoolAppIds(series, tried, batchSize),
    fetcher,
    exclude,
    packKind,
    maxAttempts,
  );
}

export async function fetchOneNewCardFromDbPool(
  series: CardSeries,
  rng: () => number,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  return fetchOneNewCardFromDbPoolWithFetcher(
    series,
    rng,
    (ids) => fetchSteamPoolResponseForIds(ids, series),
    exclude,
    packKind,
    maxAttempts,
  );
}
