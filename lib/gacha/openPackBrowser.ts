/**
 * Открытие пака в браузере без Prisma: только fetch к /api/steam/pool-random и pool-details.
 */
import type { CardSeries } from "@/lib/gacha/steamPools";
import type { PackKind } from "@/lib/gacha/packKinds";
import type { SteamCard } from "@/lib/gacha/types";
import {
  fetchOneNewCardFromDbPoolWithBatchPicker,
  fetchPoolDetailsFromApi,
  openPackFromDbPoolWithBatchPicker,
  type OpenPackOptions,
  type OpenPackResult,
} from "@/lib/gacha/openPackShared";

/** Как `MERGED_APP_DETAILS_IDS_CAP` в API pool-details / pool-random. */
const POOL_RANDOM_IDS_CAP = 40;

async function pickRandomSteamPoolAppIdsViaApi(
  origin: string,
  series: CardSeries,
  tried: Set<number>,
  limit: number,
): Promise<number[]> {
  const lim = Math.min(
    POOL_RANDOM_IDS_CAP,
    Math.max(1, Math.floor(limit)),
  );
  const exclude = [...tried].join(",");
  const res = await fetch(
    `${origin}/api/steam/pool-random?series=${encodeURIComponent(String(series))}&limit=${encodeURIComponent(String(lim))}&exclude=${encodeURIComponent(exclude)}`,
    { signal: AbortSignal.timeout(55_000) },
  );
  const raw = await res.text();
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      "Ответ pool-random не JSON. Обновите страницу и попробуйте снова.",
    );
  }
  if (!res.ok) {
    const err = body as { error?: string };
    throw new Error(err.error ?? "pool-random request failed");
  }
  const appids = (body as { appids?: unknown }).appids;
  if (!Array.isArray(appids)) return [];
  return appids.filter(
    (n): n is number =>
      typeof n === "number" && Number.isFinite(n) && n > 0,
  );
}

export async function openPackFromPool(
  series: CardSeries,
  rng: () => number,
  origin: string,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  return openPackFromDbPoolWithBatchPicker(
    rng,
    (tried, batchSize) =>
      pickRandomSteamPoolAppIdsViaApi(origin, series, tried, batchSize),
    (ids) => fetchPoolDetailsFromApi(origin, ids, series),
    options,
  );
}

export async function fetchOneNewCard(
  series: CardSeries,
  rng: () => number,
  origin: string,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  return fetchOneNewCardFromDbPoolWithBatchPicker(
    rng,
    (tried, batchSize) =>
      pickRandomSteamPoolAppIdsViaApi(origin, series, tried, batchSize),
    (ids) => fetchPoolDetailsFromApi(origin, ids, series),
    exclude,
    packKind,
    maxAttempts,
  );
}
