import { buildSteamCard } from "@/lib/gacha/buildCard";
import { packScoreDelta, type PackKind } from "@/lib/gacha/packKinds";
import { isRarePlus } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";
import type { SteamAppDetailsResponse } from "@/lib/steam/types";
import { sampleWithoutReplacement } from "./sample";

/** Пакет Steam appdetails (HTTP-прокси или прямой server fetch). */
export type SteamDetailsFetcher = (
  ids: number[],
) => Promise<SteamAppDetailsResponse>;

const PACK_SIZE = 5;
/** Больше попыток — если часть appid из пула не собирается в карту (нет header и т.д.). */
const MAX_ATTEMPTS = 24;
/**
 * До столько appid за один вызов прокси (см. appdetails route, лимит ids).
 * Больше — меньше кругов openPack → меньше RTT браузер ↔ сервер на один пак.
 */
const BATCH_MAX = 40;
/**
 * Пауза между батчами внутри одного открытия. Прокси сам ограничивает параллелизм к Steam;
 * лишняя задержка здесь только растягивала UX без пользы для 429.
 */
const PAUSE_BETWEEN_BATCH_MS = 0;
const PITY_REPLACE_ATTEMPTS = 18;

export type OpenPackOptions = {
  packKind?: PackKind;
  /** Если true — гарантировать хотя бы одну карту rare+ (питти). */
  forcePityRarePlus?: boolean;
};

export type OpenPackResult = {
  cards: SteamCard[];
  /** Сработала подмена слота для питти */
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

export async function fetchAppDetails(
  origin: string,
  ids: number[],
): Promise<SteamAppDetailsResponse> {
  const q = [...new Set(ids)].join(",");
  const res = await fetch(
    `${origin}/api/steam/appdetails?ids=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(55_000) },
  );
  const raw = await res.text();
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      "Ответ прокси Steam не JSON (сеть, таймаут хостинга или блокировка). Обновите страницу и попробуйте снова.",
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
    throw new Error(msg || "Steam proxy request failed");
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

/**
 * Собирает пак из пула appid (сервер: прямой Steam; клиент: fetch на /api/steam/appdetails).
 */
export async function openPackFromPoolWithFetcher(
  pool: number[],
  rng: () => number,
  fetcher: SteamDetailsFetcher,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  if (pool.length === 0) throw new Error("App id pool is empty");

  const kind = options?.packKind ?? "standard";
  const baseBonus = packScoreDelta(kind);
  const cards: SteamCard[] = [];
  const tried = new Set<number>();
  let attempts = 0;

  while (cards.length < PACK_SIZE && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const remaining = pool.filter((id) => !tried.has(id));
    if (remaining.length === 0) {
      tried.clear();
      continue;
    }
    const need = PACK_SIZE - cards.length;
    const batchSize = Math.min(
      BATCH_MAX,
      Math.max(need * 4, need + 8),
      remaining.length,
    );
    const batch = sampleWithoutReplacement(remaining, batchSize, rng);
    batch.forEach((id) => tried.add(id));

    const built = await fetchAndParseBonusWithFetcher(
      fetcher,
      batch,
      baseBonus,
    );
    for (const c of built) {
      if (cards.length >= PACK_SIZE) break;
      if (cards.some((x) => x.appid === c.appid)) continue;
      cards.push(c);
    }
  }

  if (cards.length < PACK_SIZE) {
    throw new Error(
      "Не удалось собрать полный пак — попробуйте ещё раз или обновите пул appid.",
    );
  }

  let pityActivated = false;
  if (
    options?.forcePityRarePlus &&
    !cards.some((c) => isRarePlus(c.rarity))
  ) {
    const fallback = cards[PACK_SIZE - 1]!;
    cards.pop();
    let replaced: SteamCard | null = null;
    const triedPity = new Set<number>(tried);
    for (let p = 0; p < PITY_REPLACE_ATTEMPTS && !replaced; p++) {
      const remaining = pool.filter((id) => !triedPity.has(id));
      if (remaining.length === 0) {
        triedPity.clear();
        continue;
      }
      const batchSize = Math.min(BATCH_MAX, Math.max(12, remaining.length));
      const batch = sampleWithoutReplacement(remaining, batchSize, rng);
      batch.forEach((id) => triedPity.add(id));
      const built = await fetchAndParseBonusWithFetcher(
        fetcher,
        batch,
        baseBonus,
      );
      replaced =
        built.find(
          (c) => isRarePlus(c.rarity) && !cards.some((x) => x.appid === c.appid),
        ) ?? null;
    }
    if (replaced) {
      cards.push(replaced);
      pityActivated = true;
    } else {
      cards.push(fallback);
      pityActivated = true;
    }
  }

  return { cards, pityActivated };
}

/**
 * Собирает пак из пула appid (браузер: origin → /api/steam/appdetails).
 */
export async function openPackFromPool(
  pool: number[],
  rng: () => number,
  origin: string,
  options?: OpenPackOptions,
): Promise<OpenPackResult> {
  const fetcher: SteamDetailsFetcher = (ids) => fetchAppDetails(origin, ids);
  return openPackFromPoolWithFetcher(pool, rng, fetcher, options);
}

/** Одна новая карта из пула, не пересекающаяся с exclude appid. */
export async function fetchOneNewCardWithFetcher(
  pool: number[],
  rng: () => number,
  fetcher: SteamDetailsFetcher,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  const baseBonus = packScoreDelta(packKind);
  const tried = new Set<number>();
  for (let a = 0; a < maxAttempts; a++) {
    const remaining = pool.filter((id) => !tried.has(id));
    if (remaining.length === 0) {
      tried.clear();
      continue;
    }
    const batchSize = Math.min(BATCH_MAX, Math.max(8, remaining.length));
    const batch = sampleWithoutReplacement(remaining, batchSize, rng);
    batch.forEach((id) => tried.add(id));
    const built = await fetchAndParseBonusWithFetcher(
      fetcher,
      batch,
      baseBonus,
    );
    const pick = built.find((c) => !exclude.has(c.appid));
    if (pick) return pick;
  }
  return null;
}

export async function fetchOneNewCard(
  pool: number[],
  rng: () => number,
  origin: string,
  exclude: Set<number>,
  packKind: PackKind,
  maxAttempts = 10,
): Promise<SteamCard | null> {
  const fetcher: SteamDetailsFetcher = (ids) => fetchAppDetails(origin, ids);
  return fetchOneNewCardWithFetcher(
    pool,
    rng,
    fetcher,
    exclude,
    packKind,
    maxAttempts,
  );
}
