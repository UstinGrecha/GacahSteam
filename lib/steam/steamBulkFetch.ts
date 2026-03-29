import type { SteamAppDetailsResponse } from "@/lib/steam/types";

const STEAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*;q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://store.steampowered.com/",
};

const MAX_RETRIES = 4;
const RETRY_BASE_MS = 600;
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Сколько appid в одном GET (`appids=1,2,3,…`) — без отдельного запроса на каждый id.
 */
export const STEAM_BULK_APPIDS_PER_REQUEST = 250;

function looksLikeJson(ct: string, text: string): boolean {
  if (ct.includes("application/json") || ct.includes("text/javascript"))
    return true;
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

function steamUrlBulk(appids: number[]): string {
  const q = new URLSearchParams({
    appids: appids.join(","),
    l: "english",
    cc: "US",
  });
  return `https://store.steampowered.com/api/appdetails?${q.toString()}`;
}

async function fetchOneBulkChunk(
  appids: number[],
  attempt = 0,
): Promise<SteamAppDetailsResponse | null> {
  if (!appids.length) return {};
  const url = steamUrlBulk(appids);
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
            ? Math.min(60_000, Math.max(2000, sec * 1000))
            : Math.min(20_000, 2000 * (attempt + 1));
        }
        await new Promise((r) => setTimeout(r, wait));
        return fetchOneBulkChunk(appids, attempt + 1);
      }
      return null;
    }

    if (!looksLikeJson(ct, text)) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, RETRY_BASE_MS * (attempt + 1)),
        );
        return fetchOneBulkChunk(appids, attempt + 1);
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
        return fetchOneBulkChunk(appids, attempt + 1);
      }
      return null;
    }

    if (json == null || typeof json !== "object") return null;
    return json as SteamAppDetailsResponse;
  } catch {
    if (attempt < MAX_RETRIES - 1) {
      const backoff = RETRY_BASE_MS * (attempt + 1);
      await new Promise((r) => setTimeout(r, backoff));
      return fetchOneBulkChunk(appids, attempt + 1);
    }
    return null;
  }
}

function mergeInto(
  out: SteamAppDetailsResponse,
  part: SteamAppDetailsResponse | null,
): void {
  if (!part) return;
  for (const [k, v] of Object.entries(part)) {
    if (k === "_meta") continue;
    if (v && typeof v === "object") out[k] = v;
  }
}

/**
 * Один неудавшийся чанк: делим пополам и мержим (без параллельных запросов на каждый id).
 */
async function mergeChunkRecursive(
  chunk: number[],
  out: SteamAppDetailsResponse,
): Promise<void> {
  if (chunk.length === 0) return;

  const part = await fetchOneBulkChunk(chunk);
  const got = part
    ? Object.keys(part).filter((k) => k !== "_meta").length
    : 0;

  if (got > 0) {
    mergeInto(out, part);
    return;
  }

  if (chunk.length === 1) return;

  const mid = Math.floor(chunk.length / 2);
  await mergeChunkRecursive(chunk.slice(0, mid), out);
  await mergeChunkRecursive(chunk.slice(mid), out);
}

/**
 * Последовательные крупные GET по `STEAM_BULK_APPIDS_PER_REQUEST` appid за раз
 * (один HTTP-запрос на чанк, не N параллельных запросов на каждый id).
 */
export async function fetchSteamAppDetailsBulkSequential(
  idsInput: number[],
  options?: { pauseMsBetweenChunks?: number; chunkSize?: number },
): Promise<SteamAppDetailsResponse> {
  const pauseMs = options?.pauseMsBetweenChunks ?? 450;
  const chunkSize = Math.max(
    10,
    Math.min(500, options?.chunkSize ?? STEAM_BULK_APPIDS_PER_REQUEST),
  );

  const ids = [...new Set(idsInput.filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) {
    throw new Error("Нет корректных appid для Steam.");
  }

  const merged: SteamAppDetailsResponse = {};

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await mergeChunkRecursive(chunk, merged);

    if (pauseMs > 0 && i + chunkSize < ids.length) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }

  const keys = Object.keys(merged).filter((k) => k !== "_meta");
  if (keys.length === 0) {
    throw new Error(
      "Не удалось получить данные Steam (таймаут, 429 или блокировка). Повторите позже.",
    );
  }

  return merged;
}
