import { getPrisma } from "@/lib/db/prisma";
import { setCachedAppDetails } from "@/lib/steam/appDetailsCache";
import type { SteamAppDetailsEntry } from "@/lib/steam/types";

function isPersistableEntry(v: unknown): v is SteamAppDetailsEntry {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.success !== true) return false;
  const data = o.data;
  if (data == null || typeof data !== "object") return false;
  return true;
}

/**
 * Загрузка закэшированных ответов Steam из БД. При успехе прогревает in-memory LRU.
 * Без DATABASE_URL или при ошибке БД возвращает пустую карту.
 */
export async function loadSteamDetailsFromDb(
  ids: number[],
): Promise<Map<number, SteamAppDetailsEntry>> {
  const out = new Map<number, SteamAppDetailsEntry>();
  if (!ids.length) return out;
  if (!process.env.DATABASE_URL?.trim()) return out;

  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!uniq.length) return out;

  try {
    const prisma = getPrisma();
    const rows = await prisma.steamAppDetailsCache.findMany({
      where: { appid: { in: uniq } },
    });

    for (const row of rows) {
      try {
        const parsed: unknown = JSON.parse(row.payloadJson);
        if (!isPersistableEntry(parsed)) continue;
        setCachedAppDetails(row.appid, parsed);
        out.set(row.appid, parsed);
      } catch {
        /* malformed row */
      }
    }
  } catch {
    /* БД недоступна или миграция не применена */
  }

  return out;
}

/**
 * Сохраняет успешные ответы Steam в БД. Идемпотентно по appid.
 */
export async function persistSteamDetailsToDb(
  entries: Array<{ appid: number; entry: SteamAppDetailsEntry }>,
): Promise<void> {
  if (!entries.length) return;
  if (!process.env.DATABASE_URL?.trim()) return;

  const byApp = new Map<number, SteamAppDetailsEntry>();
  for (const { appid, entry } of entries) {
    if (!Number.isFinite(appid) || appid <= 0) continue;
    if (!isPersistableEntry(entry)) continue;
    byApp.set(appid, entry);
  }
  if (!byApp.size) return;

  try {
    const prisma = getPrisma();
    await prisma.$transaction(
      [...byApp.entries()].map(([appid, entry]) =>
        prisma.steamAppDetailsCache.upsert({
          where: { appid },
          create: {
            appid,
            payloadJson: JSON.stringify(entry),
          },
          update: {
            payloadJson: JSON.stringify(entry),
          },
        }),
      ),
    );
  } catch {
    /* не блокируем открытие пака */
  }
}
