/**
 * Заполняет SteamPoolEntry для серии 1: крупные GET (appids=1,2,3,…), без параллели на каждый id.
 * Требуется DATABASE_URL. Запуск: npm run seed:steam-pool
 */
import "dotenv/config";

import { POOL_SERIES_1, SERIES_1_POOL_SIZE } from "@/lib/gacha/steamPools";
import { getPrisma } from "@/lib/db/prisma";
import {
  STEAM_BULK_APPIDS_PER_REQUEST,
  fetchSteamAppDetailsBulkSequential,
} from "@/lib/steam/steamBulkFetch";
import { upsertSteamPoolEntries } from "@/lib/steam/steamPoolDb";

const SERIES = 1 as const;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }
  const prisma = getPrisma();

  const target = POOL_SERIES_1;
  if (target.length < SERIES_1_POOL_SIZE) {
    throw new Error(
      `Нужно минимум ${SERIES_1_POOL_SIZE} appid в data/steam-app-ids.json (с учётом якорей), сейчас ${target.length}.`,
    );
  }

  const already = await prisma.steamPoolEntry.findMany({
    where: { series: SERIES },
    select: { appid: true },
  });
  const have = new Set(already.map((r) => r.appid));
  const ids = target.filter((id) => !have.has(id));
  console.log(
    `В БД уже ${have.size} игр серии ${SERIES}; к докачке: ${ids.length} appid.`,
  );
  if (ids.length === 0) {
    console.log("Нечего добавлять.");
    return;
  }

  const chunks = Math.ceil(ids.length / STEAM_BULK_APPIDS_PER_REQUEST);
  console.log(
    `Загрузка: ${chunks} крупных запросов по ~${STEAM_BULK_APPIDS_PER_REQUEST} appid (последовательно, пауза между чанками).`,
  );

  const merged = await fetchSteamAppDetailsBulkSequential(ids, {
    pauseMsBetweenChunks: 500,
    chunkSize: STEAM_BULK_APPIDS_PER_REQUEST,
  });

  const keys = Object.keys(merged).filter((k) => k !== "_meta").length;
  console.log(`Steam вернул записей: ${keys}. Запись в БД…`);

  const written = await upsertSteamPoolEntries(SERIES, merged);
  console.log(
    `Готово. Upsert строк в SteamPoolEntry: ${written} (ожидалось до ${ids.length}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
