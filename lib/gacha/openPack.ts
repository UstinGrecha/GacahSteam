import { buildSteamCard } from "@/lib/gacha/buildCard";
import { packScoreDelta, type PackKind } from "@/lib/gacha/packKinds";
import {
  computeStrictRarity,
  strictContextFromSteamData,
} from "@/lib/gacha/rarityStrict";
import { isRarePlus } from "@/lib/gacha/stats";
import type { Rarity, SteamCard } from "@/lib/gacha/types";
import { steamDataToMetrics } from "@/lib/steam/parse";
import type {
  SteamAppDetailsData,
  SteamAppDetailsResponse,
} from "@/lib/steam/types";
import { sampleWithoutReplacement } from "./sample";

const PACK_SIZE = 5;
/** Больше попыток — если часть appid из пула не собирается в карту (нет header и т.д.). */
const MAX_ATTEMPTS = 24;
/** Меньше id за запрос — меньше шанс 429 от Steam при пакетной подгрузке. */
const BATCH_MAX = 10;
const PAUSE_BETWEEN_BATCH_MS = 200;
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
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
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
  return res.json() as Promise<SteamAppDetailsResponse>;
}

async function fetchAndParseBonus(
  origin: string,
  ids: number[],
  scoreBonus: number,
): Promise<SteamCard[]> {
  const data = await fetchAppDetails(origin, ids);
  await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_BATCH_MS));
  return parseDetailsToCards(data, scoreBonus);
}

/**
 * Собирает пак из пула appid.
 */
export async function openPackFromPool(
  pool: number[],
  rng: () => number,
  origin: string,
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

    const built = await fetchAndParseBonus(origin, batch, baseBonus);
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
      const built = await fetchAndParseBonus(origin, batch, baseBonus);
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

/** Слоты витрины: под каждый ищется игра с тем же жёстким тиром, что и в бою. */
const DEBUG_SHOWCASE_SLOT_TARGETS: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "holo",
  "legend",
];

function emptyRarityBuckets(): Record<
  Rarity,
  { appid: number; data: SteamAppDetailsData }[]
> {
  return {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    holo: [],
    legend: [],
  };
}

export async function fetchDebugShowcaseCards(
  origin: string,
  pool: number[],
  rng: () => number,
): Promise<SteamCard[]> {
  if (pool.length === 0) throw new Error("App id pool is empty");
  const buckets = emptyRarityBuckets();
  const tried = new Set<number>();
  let attempts = 0;
  const maxAttempts = 96;

  const filled = () =>
    DEBUG_SHOWCASE_SLOT_TARGETS.every((t) => buckets[t].length > 0);

  while (!filled() && attempts < maxAttempts) {
    attempts += 1;
    const remaining = pool.filter((id) => !tried.has(id));
    if (remaining.length === 0) {
      tried.clear();
      continue;
    }
    const batchSize = Math.min(
      BATCH_MAX,
      Math.max(24, remaining.length),
      remaining.length,
    );
    const batch = sampleWithoutReplacement(remaining, batchSize, rng);
    batch.forEach((id) => tried.add(id));
    const resp = await fetchAppDetails(origin, batch);
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_BATCH_MS));
    for (const [key, entry] of Object.entries(resp)) {
      if (key === "_meta") continue;
      if (!entry?.success || !entry.data) continue;
      const appid = Number(key);
      if (!Number.isFinite(appid)) continue;
      const metrics = steamDataToMetrics(entry.data);
      const tier = computeStrictRarity(
        metrics,
        strictContextFromSteamData(entry.data, metrics),
      );
      if (buckets[tier].some((x) => x.appid === appid)) continue;
      if (!buildSteamCard(appid, entry.data, {})) continue;
      buckets[tier].push({ appid, data: entry.data });
    }
  }

  const chosen = new Set<number>();
  const cards: SteamCard[] = [];
  for (const target of DEBUG_SHOWCASE_SLOT_TARGETS) {
    const candidates = buckets[target].filter((x) => !chosen.has(x.appid));
    if (candidates.length === 0) {
      throw new Error(
        `Отладка: в пуле не нашлось валидной игры с тиром «${target}». Откройте ещё паки или расширьте пул appid.`,
      );
    }
    const pick =
      candidates[
        Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))
      ]!;
    chosen.add(pick.appid);
    const c = buildSteamCard(pick.appid, pick.data, {});
    if (!c) throw new Error("Не удалось собрать карту витрины редкостей.");
    cards.push(c);
  }
  return cards;
}

/** Одна новая карта из пула, не пересекающаяся с exclude appid. */
export async function fetchOneNewCard(
  pool: number[],
  rng: () => number,
  origin: string,
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
    const built = await fetchAndParseBonus(origin, batch, baseBonus);
    const pick = built.find((c) => !exclude.has(c.appid));
    if (pick) return pick;
  }
  return null;
}
