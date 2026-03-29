import { buildSteamCard } from "@/lib/gacha/buildCard";
import { packScoreDelta, type PackKind } from "@/lib/gacha/packKinds";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { isRarePlus, rarityOneStepDown } from "@/lib/gacha/stats";
import type { Rarity, SteamCard } from "@/lib/gacha/types";
import type { SteamAppDetailsResponse } from "@/lib/steam/types";
import {
  applyPackPowerMultiplier,
  rollWeightedPackRarity,
} from "@/lib/gacha/weightedPack";

/** Число карт в одном паке (пул SteamPoolEntry). */
export const OPEN_PACK_SIZE = 5;

/** Ответ appdetails из БД или HTTP-эндпоинта pool-details. */
export type SteamDetailsFetcher = (
  ids: number[],
) => Promise<SteamAppDetailsResponse>;

const PACK_SIZE = OPEN_PACK_SIZE;
const BATCH_MAX = 40;
const PAUSE_BETWEEN_BATCH_MS = 0;
const PITY_REPLACE_ATTEMPTS = 18;
/** Сколько батчей appid перебрать, чтобы найти карту ровно выпавшей редкости (без понижения тира). */
const ROUNDS_TO_MATCH_ROLLED_RARITY = 500;

export type OpenPackOptions = {
  packKind?: PackKind;
  forcePityRarePlus?: boolean;
};

export type OpenPackResult = {
  cards: SteamCard[];
  pityActivated: boolean;
};

export function parseDetailsToCards(
  resp: SteamAppDetailsResponse,
  scoreBonus: number,
): SteamCard[] {
  const out: SteamCard[] = [];
  for (const [key, entry] of Object.entries(resp)) {
    if (key === "_meta") continue;
    if (!entry?.success || !entry.data) continue;
    const appid = Number(key);
    if (!Number.isFinite(appid)) continue;
    const card = buildSteamCard(appid, entry.data, { scoreBonus });
    if (card) out.push(card);
  }
  return out;
}

/** Клиент: данные карточек только из БД через `/api/steam/pool-details`. */
export async function fetchPoolDetailsFromApi(
  origin: string,
  ids: number[],
  series: CardSeries,
): Promise<SteamAppDetailsResponse> {
  const q = [...new Set(ids)].join(",");
  const res = await fetch(
    `${origin}/api/steam/pool-details?ids=${encodeURIComponent(q)}&series=${encodeURIComponent(String(series))}`,
    { signal: AbortSignal.timeout(55_000) },
  );
  const raw = await res.text();
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      "Ответ pool-details не JSON (сеть, таймаут или блокировка). Обновите страницу и попробуйте снова.",
    );
  }
  if (!res.ok) {
    const err = body as {
      error?: string;
      status?: number;
      statusText?: string;
      detail?: string;
    };
    const msg = [
      err.error,
      err.status != null ? `HTTP ${err.status}` : "",
      err.statusText,
      err.detail,
    ]
      .filter(Boolean)
      .join(" — ");
    throw new Error(msg || "pool-details request failed");
  }
  return body as SteamAppDetailsResponse;
}

async function fetchAndParseBonusWithFetcher(
  fetcher: SteamDetailsFetcher,
  ids: number[],
  scoreBonus: number,
): Promise<SteamCard[]> {
  const data = await fetcher(ids);
  if (PAUSE_BETWEEN_BATCH_MS > 0) {
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_BATCH_MS));
  }
  return parseDetailsToCards(data, scoreBonus);
}

/** Подобрать одну карту строго с редкостью `target` (как в броске слота). */
async function findCardExactRarity(
  target: Rarity,
  pickBatch: (tried: Set<number>, batchSize: number) => Promise<number[]>,
  fetcher: SteamDetailsFetcher,
  baseBonus: number,
  tried: Set<number>,
  excludeAppIds: Set<number>,
): Promise<SteamCard | null> {
  for (let round = 0; round < ROUNDS_TO_MATCH_ROLLED_RARITY; round++) {
    const batch = await pickBatch(tried, BATCH_MAX);
    if (batch.length === 0) {
      tried.clear();
      continue;
    }
    batch.forEach((id) => tried.add(id));
    const built = await fetchAndParseBonusWithFetcher(
      fetcher,
      batch,
      baseBonus,
    );
    for (const c of built) {
      if (excludeAppIds.has(c.appid)) continue;
      if (c.rarity === target) {
        excludeAppIds.add(c.appid);
        return applyPackPowerMultiplier(c);
      }
    }
  }
  return null;
}

/**
 * Пак из пула: на каждый слот независимо бросается редкость (веса — `PACK_SLOT_RARITY_WEIGHTS`),
 * затем подбирается игра с совпадающей strict-редкостью. Если в БД нет нужного тира —
 * шаг вниз по редкости (пока не найдётся), иначе полный пул снова упирается в отсутствие
 * «легенд» в узком срезе appid. SR/UR/HR — множитель силы по фактической карте.
 */
export async function openPackFromDbPoolWithBatchPicker(
  rng: () => number,
  pickBatch: (tried: Set<number>, batchSize: number) => Promise<number[]>,
  fetcher: SteamDetailsFetcher,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  const kind = options?.packKind ?? "standard";
  const baseBonus = packScoreDelta(kind);
  const cards: SteamCard[] = [];
  const usedInPack = new Set<number>();

  for (let slot = 0; slot < PACK_SIZE; slot++) {
    const rolled = rollWeightedPackRarity(rng);
    let card: SteamCard | null = null;
    for (
      let target: Rarity | null = rolled;
      target != null && !card;
      target = rarityOneStepDown(target)
    ) {
      const triedForSlot = new Set<number>();
      card = await findCardExactRarity(
        target,
        pickBatch,
        fetcher,
        baseBonus,
        triedForSlot,
        usedInPack,
      );
    }
    if (!card) {
      throw new Error(
        `Не удалось найти в пуле карту (от «${rolled}» до common) — пополните SteamPoolEntry.`,
      );
    }
    cards.push(card);
  }

  let pityActivated = false;
  if (
    options?.forcePityRarePlus &&
    !cards.some((c) => isRarePlus(c.rarity))
  ) {
    const fallback = cards[PACK_SIZE - 1]!;
    cards.pop();
    usedInPack.delete(fallback.appid);
    let replaced: SteamCard | null = null;
    const triedPity = new Set<number>();
    for (let p = 0; p < PITY_REPLACE_ATTEMPTS && !replaced; p++) {
      const batch = await pickBatch(triedPity, BATCH_MAX);
      if (batch.length === 0) {
        triedPity.clear();
        continue;
      }
      batch.forEach((id) => triedPity.add(id));
      const built = await fetchAndParseBonusWithFetcher(
        fetcher,
        batch,
        baseBonus,
      );
      const hit =
        built.find(
          (c) =>
            isRarePlus(c.rarity) &&
            !usedInPack.has(c.appid) &&
            !cards.some((x) => x.appid === c.appid),
        ) ?? null;
      if (hit) {
        usedInPack.add(hit.appid);
        replaced = applyPackPowerMultiplier(hit);
      }
    }
    if (replaced) {
      cards.push(replaced);
      pityActivated = true;
    } else {
      usedInPack.add(fallback.appid);
      cards.push(fallback);
      pityActivated = true;
    }
  }

  return { cards, pityActivated };
}

export async function fetchOneNewCardFromDbPoolWithBatchPicker(
  rng: () => number,
  pickBatch: (tried: Set<number>, batchSize: number) => Promise<number[]>,
  fetcher: SteamDetailsFetcher,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  const baseBonus = packScoreDelta(packKind);

  for (let a = 0; a < maxAttempts; a++) {
    const rolled = rollWeightedPackRarity(rng);
    const excludeCopy = new Set(exclude);
    let card: SteamCard | null = null;
    for (
      let target: Rarity | null = rolled;
      target != null && !card;
      target = rarityOneStepDown(target)
    ) {
      const tried = new Set<number>();
      card = await findCardExactRarity(
        target,
        pickBatch,
        fetcher,
        baseBonus,
        tried,
        excludeCopy,
      );
      if (card) return card;
    }
  }
  return null;
}
