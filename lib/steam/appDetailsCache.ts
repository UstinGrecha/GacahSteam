import type { SteamAppDetailsEntry } from "@/lib/steam/types";

/**
 * In-memory LRU + TTL для ответов Steam по appid.
 * При многих пользователях одни и те же id из пула попадают в кэш на инстансе
 * serverless — резко меньше исходящих запросов к store.steampowered.com.
 */
const TTL_MS = 45 * 60 * 1000;
const MAX_ENTRIES = 25_000;

type StoreEntry = { expires: number; value: SteamAppDetailsEntry };

const store = new Map<number, StoreEntry>();

function touch(appid: number, row: StoreEntry) {
  store.delete(appid);
  store.set(appid, row);
}

export function getCachedAppDetails(
  appid: number,
): SteamAppDetailsEntry | undefined {
  const row = store.get(appid);
  if (!row) return undefined;
  if (row.expires < Date.now()) {
    store.delete(appid);
    return undefined;
  }
  touch(appid, row);
  return row.value;
}

export function setCachedAppDetails(
  appid: number,
  value: SteamAppDetailsEntry,
): void {
  if (!value?.success || !value.data) return;
  while (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value as number | undefined;
    if (first === undefined) break;
    store.delete(first);
  }
  touch(appid, {
    expires: Date.now() + TTL_MS,
    value,
  });
}
