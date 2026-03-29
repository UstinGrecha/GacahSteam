/**
 * Загрузка трофейных игр рейда (Among Us 945360, Terraria 105600) в SteamPoolEntry.
 * Требуется DATABASE_URL. Запуск: npm run seed:raid-reward
 */
import "dotenv/config";

import { getPrisma } from "@/lib/db/prisma";
import { RAID_BOSS_REWARD_APPIDS } from "@/lib/gacha/raidReward";
import { fetchSteamAppDetailsBulkSequential } from "@/lib/steam/steamBulkFetch";
import { upsertSteamPoolEntries } from "@/lib/steam/steamPoolDb";

const SERIES = 1 as const;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = getPrisma();
  const ids = [...RAID_BOSS_REWARD_APPIDS];
  const merged = await fetchSteamAppDetailsBulkSequential(ids, {
    pauseMsBetweenChunks: 400,
    chunkSize: 50,
  });

  const n = await upsertSteamPoolEntries(SERIES, merged);
  const results = await Promise.all(
    ids.map((appid) =>
      prisma.steamPoolEntry.findUnique({ where: { appid } }),
    ),
  );
  const ok = ids.map((appid, i) => `${appid}: ${results[i] ? "да" : "нет"}`);
  console.log(`Upsert записей: ${n}. В БД — ${ok.join(", ")}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
