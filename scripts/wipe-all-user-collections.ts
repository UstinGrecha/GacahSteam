/**
 * Очистить коллекцию (все пулы / spareCopies / связанные счётчики) у всех GameSave.
 * Удаляет все лоты маркета (иначе остаются «висячие» продажи без карт в сейве).
 *
 * Не трогает: coins, dust, daily/hourly, login streak (кроме достижений — пересчёт с нуля).
 *
 * Запуск: npx tsx scripts/wipe-all-user-collections.ts
 */
import "dotenv/config";

import { syncAchievements } from "@/lib/achievements/sync";
import { getPrisma } from "@/lib/db/prisma";
import {
  defaultState,
  hydrateStoredStateFromApi,
} from "@/lib/storage/persist";
import type { StoredState } from "@/lib/storage/types";

function wipeCollection(state: StoredState): void {
  state.pulls = [];
  state.spareCopies = {};
  state.salvageCount = 0;
  state.pity = { packsSinceRarePlus: 0 };
  state.pityActivations = 0;
  state.raid = { lastRewardWeekKey: null };
  state.achievements = {};
  syncAchievements(state);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = getPrisma();

  const deletedListings = await prisma.marketListing.deleteMany({});
  console.log(`Удалено лотов маркета: ${deletedListings.count}`);

  const rows = await prisma.gameSave.findMany({
    select: { userId: true, payload: true },
  });
  console.log(`Записей GameSave: ${rows.length}`);

  let updated = 0;
  for (const row of rows) {
    let state: StoredState;
    try {
      state = row.payload?.trim()
        ? hydrateStoredStateFromApi(JSON.parse(row.payload) as unknown)
        : defaultState();
    } catch {
      state = defaultState();
    }
    wipeCollection(state);
    await prisma.gameSave.update({
      where: { userId: row.userId },
      data: { payload: JSON.stringify(state) },
    });
    updated += 1;
  }

  console.log(`Обновлено сохранений: ${updated}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await getPrisma().$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
