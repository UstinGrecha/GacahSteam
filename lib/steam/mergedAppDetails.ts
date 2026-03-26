import {
  getCachedAppDetails,
  setCachedAppDetails,
} from "@/lib/steam/appDetailsCache";
import {
  loadSteamDetailsFromDb,
  persistSteamDetailsToDb,
} from "@/lib/steam/steamDetailsDbCache";
import type {
  SteamAppDetailsEntry,
  SteamAppDetailsResponse,
} from "@/lib/steam/types";

const STEAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*;q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://store.steampowered.com/",
};

const PER_ID_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 280;
const FETCH_TIMEOUT_MS = 12_000;

/** Максимум id за один запрос (как у HTTP-прокси). */
export const MERGED_APP_DETAILS_IDS_CAP = 40;

function steamUrlSingle(appid: number): string {
  const q = new URLSearchParams({
    appids: String(appid),
    l: "english",
    cc: "US",
  });
  return `https://store.steampowered.com/api/appdetails?${q.toString()}`;
}

function looksLikeJson(ct: string, text: string): boolean {
  if (ct.includes("application/json") || ct.includes("text/javascript"))
    return true;
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

async function fetchOneAppIdUncached(
  appid: number,
  attempt = 0,
): Promise<SteamAppDetailsResponse | null> {
  const url = steamUrlSingle(appid);
  try {
    const steamRes = await fetch(url, {
      headers: STEAM_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const text = await steamRes.text();
    const ct = steamRes.headers.get("content-type") ?? "";

    if (!steamRes.ok) {
      if (attempt < MAX_RETRIES - 1) {
        let wait = RETRY_BASE_MS * (attempt + 1) ** 2;
        if (steamRes.status === 429) {
          const ra = steamRes.headers.get("retry-after");
          const sec = ra ? Number.parseInt(ra, 10) : NaN;
          wait = Number.isFinite(sec)
            ? Math.min(8000, Math.max(900, sec * 1000))
            : Math.min(6000, 1000 * (attempt + 1));
        }
        await new Promise((r) => setTimeout(r, wait));
        return fetchOneAppIdUncached(appid, attempt + 1);
      }
      return null;
    }

    if (!looksLikeJson(ct, text)) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, RETRY_BASE_MS * (attempt + 1)),
        );
        return fetchOneAppIdUncached(appid, attempt + 1);
      }
      return null;
    }

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, RETRY_BASE_MS * (attempt + 1)),
        );
        return fetchOneAppIdUncached(appid, attempt + 1);
      }
      return null;
    }

    if (json == null || typeof json !== "object") return null;
    return json as SteamAppDetailsResponse;
  } catch {
    if (attempt < MAX_RETRIES - 1) {
      const backoff = RETRY_BASE_MS * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoff));
      return fetchOneAppIdUncached(appid, attempt + 1);
    }
    return null;
  }
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  async function run(): Promise<void> {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      await worker(items[i]!);
    }
  }
  const n = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => run()));
}

/**
 * Прямая выборка Steam (кэш + параллель), без HTTP к своему API.
 * Для открытия паков на сервере.
 */
export async function fetchMergedSteamDetails(
  idsInput: number[],
): Promise<SteamAppDetailsResponse> {
  const ids = idsInput
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MERGED_APP_DETAILS_IDS_CAP);
  const unique = [...new Set(ids)];
  if (!unique.length) {
    throw new Error("Нет корректных appid для Steam.");
  }

  const merged: SteamAppDetailsResponse = {};
  const failures: number[] = [];

  for (const appid of unique) {
    const hit = getCachedAppDetails(appid);
    if (hit) merged[String(appid)] = hit;
  }

  let missList = unique.filter((id) => merged[String(id)] == null);

  if (missList.length > 0) {
    const fromDb = await loadSteamDetailsFromDb(missList);
    for (const [appid, ent] of fromDb) {
      merged[String(appid)] = ent;
    }
    missList = unique.filter((id) => merged[String(id)] == null);
  }

  const toPersist: Array<{ appid: number; entry: SteamAppDetailsEntry }> = [];

  if (missList.length > 0) {
    await runPool(missList, PER_ID_CONCURRENCY, async (appid) => {
      const part = await fetchOneAppIdUncached(appid);
      if (!part) {
        failures.push(appid);
        return;
      }
      const ent = part[String(appid)];
      if (ent) {
        merged[String(appid)] = ent;
        if (ent.success && ent.data) {
          setCachedAppDetails(appid, ent);
          toPersist.push({ appid, entry: ent });
        }
      } else {
        failures.push(appid);
      }
    });
  }

  if (toPersist.length > 0) {
    await persistSteamDetailsToDb(toPersist);
  }

  const mergedKeys = Object.keys(merged).filter((k) => k !== "_meta");
  if (mergedKeys.length === 0) {
    throw new Error(
      "Не удалось получить данные Steam (таймаут, 429 или блокировка). Повторите позже.",
    );
  }

  const uniqFailures = [...new Set(failures)].filter(
    (id) => merged[String(id)] == null,
  );

  if (uniqFailures.length) {
    return {
      ...merged,
      _meta: {
        partial: true,
        failedAppIds: uniqFailures,
      },
    } as unknown as SteamAppDetailsResponse;
  }

  return merged;
}
