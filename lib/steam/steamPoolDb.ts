import { getPrisma } from "@/lib/db/prisma";
import { EXCLUDED_FROM_PACK_POOL_APPIDS } from "@/lib/gacha/raidReward";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { Prisma } from "@prisma/client";
import type {
  SteamAppDetailsEntry,
  SteamAppDetailsResponse,
} from "@/lib/steam/types";

export async function countSteamPoolSeries(series: CardSeries): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) return 0;
  try {
    return await getPrisma().steamPoolEntry.count({ where: { series } });
  } catch {
    return 0;
  }
}

/**
 * Случайные appid из предзаполненного пула (ORDER BY RANDOM()), без exclude.
 */
export async function pickRandomSteamPoolAppIds(
  series: CardSeries,
  exclude: Set<number>,
  limit: number,
): Promise<number[]> {
  const prisma = getPrisma();
  const ex = [...new Set([...exclude, ...EXCLUDED_FROM_PACK_POOL_APPIDS])];
  const lim = Math.max(1, limit);

  if (ex.length === 0) {
    const rows = await prisma.$queryRaw<{ appid: number }[]>(
      Prisma.sql`SELECT appid FROM SteamPoolEntry WHERE series = ${series} ORDER BY RANDOM() LIMIT ${lim}`,
    );
    return rows.map((r) => r.appid);
  }

  const rows = await prisma.$queryRaw<{ appid: number }[]>(
    Prisma.sql`SELECT appid FROM SteamPoolEntry WHERE series = ${series} AND appid NOT IN (${Prisma.join(ex)}) ORDER BY RANDOM() LIMIT ${lim}`,
  );
  return rows.map((r) => r.appid);
}

function parseEntry(raw: string): SteamAppDetailsEntry | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (v == null || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.success !== true) return null;
    if (o.data == null || typeof o.data !== "object") return null;
    return v as SteamAppDetailsEntry;
  } catch {
    return null;
  }
}

/**
 * Собирает ответ в формате Steam appdetails только из строк пула (без сети).
 */
export async function fetchSteamPoolResponseForIds(
  ids: number[],
  series: CardSeries,
): Promise<SteamAppDetailsResponse> {
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!uniq.length) return {};

  const prisma = getPrisma();
  const rows = await prisma.steamPoolEntry.findMany({
    where: { appid: { in: uniq }, series },
  });

  const merged: SteamAppDetailsResponse = {};
  for (const row of rows) {
    const ent = parseEntry(row.payloadJson);
    if (ent) merged[String(row.appid)] = ent;
  }
  return merged;
}

export async function upsertSteamPoolEntries(
  series: CardSeries,
  merged: SteamAppDetailsResponse,
): Promise<number> {
  const prisma = getPrisma();
  let n = 0;
  const ops: ReturnType<typeof prisma.steamPoolEntry.upsert>[] = [];

  for (const [key, entry] of Object.entries(merged)) {
    if (key === "_meta") continue;
    if (!entry?.success || !entry.data) continue;
    const appid = Number(key);
    if (!Number.isFinite(appid) || appid <= 0) continue;
    n += 1;
    const payloadJson = JSON.stringify(entry);
    ops.push(
      prisma.steamPoolEntry.upsert({
        where: { appid },
        create: { appid, series, payloadJson },
        update: { payloadJson, series },
      }),
    );
  }

  const TX_BATCH = 400;
  for (let i = 0; i < ops.length; i += TX_BATCH) {
    await prisma.$transaction(ops.slice(i, i + TX_BATCH));
  }
  return n;
}
