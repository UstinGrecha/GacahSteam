import { NextRequest, NextResponse } from "next/server";
import type { SteamAppDetailsResponse } from "@/lib/steam/types";

export const dynamic = "force-dynamic";

/**
 * Прокси к публичному Store API для фан-проекта. Не аффилирован с Valve.
 * User-Agent как у обычного браузера; без Origin иногда стабильнее для серверного fetch.
 */
const STEAM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*;q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://store.steampowered.com/",
  "Accept-Encoding": "gzip, deflate, br",
};

const CONCURRENCY = 3;
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 250;

function steamUrlForAppId(appid: number): string {
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

async function fetchOneAppId(
  appid: number,
  attempt = 0,
): Promise<SteamAppDetailsResponse | null> {
  const url = steamUrlForAppId(appid);
  try {
    const steamRes = await fetch(url, {
      headers: STEAM_HEADERS,
      cache: "no-store",
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
            ? Math.min(15_000, Math.max(2000, sec * 1000))
            : 2000 * (attempt + 1);
        }
        await new Promise((r) => setTimeout(r, wait));
        return fetchOneAppId(appid, attempt + 1);
      }
      return null;
    }

    if (!looksLikeJson(ct, text)) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, RETRY_BASE_MS * (attempt + 1)),
        );
        return fetchOneAppId(appid, attempt + 1);
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
        return fetchOneAppId(appid, attempt + 1);
      }
      return null;
    }

    if (json == null || typeof json !== "object") {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, RETRY_BASE_MS * (attempt + 2) ** 2),
        );
        return fetchOneAppId(appid, attempt + 1);
      }
      return null;
    }

    return json as SteamAppDetailsResponse;
  } catch {
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
      return fetchOneAppId(appid, attempt + 1);
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
      await worker(items[i]);
    }
  }
  const n = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => run()));
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 25);

  if (!ids.length) {
    return NextResponse.json({ error: "ids query required" }, { status: 400 });
  }

  const unique = [...new Set(ids)];
  const merged: SteamAppDetailsResponse = {};
  const failures: number[] = [];

  await runPool(unique, CONCURRENCY, async (appid) => {
    const part = await fetchOneAppId(appid);
    if (!part) {
      failures.push(appid);
      return;
    }
    for (const [k, v] of Object.entries(part)) {
      merged[k] = v;
    }
  });

  if (!Object.keys(merged).length && unique.length > 0) {
    failures.length = 0;
    for (const appid of unique) {
      await new Promise((r) => setTimeout(r, 120));
      const part = await fetchOneAppId(appid);
      if (!part) {
        failures.push(appid);
        continue;
      }
      for (const [k, v] of Object.entries(part)) {
        merged[k] = v;
      }
    }
  }

  if (!Object.keys(merged).length) {
    const sample = unique.slice(0, 3).join(", ");
    return NextResponse.json(
      {
        error: "Steam request failed",
        status: 502,
        statusText: "No app data",
        detail: `Steam не отдал данные по запросу (часто это лимит 429 — слишком много запросов). Подождите 1–2 минуты и откройте пак снова. Пример appid: ${sample}.`,
      },
      { status: 502 },
    );
  }

  if (failures.length) {
    return NextResponse.json({
      ...merged,
      _meta: {
        partial: true,
        failedAppIds: failures,
      },
    });
  }

  return NextResponse.json(merged);
}
