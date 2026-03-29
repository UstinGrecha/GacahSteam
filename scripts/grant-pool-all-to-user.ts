/**
 * Выдать аккаунту все валидные карты из SteamPoolEntry (серия 1): по одной карте на appid.
 * Уже имеющиеся по appid не дублируются.
 *
 * Запуск: npx tsx scripts/grant-pool-all-to-user.ts
 * Переменные: DATABASE_URL; опционально GRANT_ALL_EMAIL (по умолчанию ниже).
 */
import "dotenv/config";

import { syncAchievements } from "@/lib/achievements/sync";
import {
  applyLoginStreakUtc,
  economySyncUtc,
} from "@/lib/economy/syncUtc";
import { buildSteamCard } from "@/lib/gacha/buildCard";
import { getPrisma } from "@/lib/db/prisma";
import type { SteamAppDetailsEntry } from "@/lib/steam/types";
import {
  defaultState,
  hydrateStoredStateFromApi,
} from "@/lib/storage/persist";
import { addCardsToSpareCopies } from "@/lib/storage/spareCopies";
import type { StoredState } from "@/lib/storage/types";
import { randomUUID } from "node:crypto";

const DEFAULT_EMAIL = "salimov-eduard@bk.ru";
const SERIES = 1 as const;
const BATCH = 400;
const PACK = 5;

function ownedAppIds(state: StoredState): Set<number> {
  const s = new Set<number>();
  for (const p of state.pulls) {
    for (const c of p.cards) s.add(c.appid);
  }
  return s;
}

async function main() {
  const email = (process.env.GRANT_ALL_EMAIL ?? DEFAULT_EMAIL).trim();
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Пользователь не найден: ${email}`);
  }

  const saveRow = await prisma.gameSave.findUnique({
    where: { userId: user.id },
  });
  let state: StoredState = saveRow?.payload
    ? hydrateStoredStateFromApi(JSON.parse(saveRow.payload) as unknown)
    : defaultState();

  applyLoginStreakUtc(state);
  economySyncUtc(state);

  const owned = ownedAppIds(state);
  const toAdd: NonNullable<ReturnType<typeof buildSteamCard>>[] = [];
  let skippedJson = 0;
  let skippedBuild = 0;

  let skip = 0;
  for (;;) {
    const rows = await prisma.steamPoolEntry.findMany({
      where: { series: SERIES },
      select: { appid: true, payloadJson: true },
      skip,
      take: BATCH,
      orderBy: { appid: "asc" },
    });
    if (rows.length === 0) break;
    skip += rows.length;

    for (const row of rows) {
      if (owned.has(row.appid)) continue;

      let entry: SteamAppDetailsEntry;
      try {
        entry = JSON.parse(row.payloadJson) as SteamAppDetailsEntry;
      } catch {
        skippedJson += 1;
        continue;
      }
      if (!entry?.success || !entry.data) {
        skippedJson += 1;
        continue;
      }
      const card = buildSteamCard(row.appid, entry.data);
      if (!card) {
        skippedBuild += 1;
        continue;
      }
      toAdd.push(card);
      owned.add(card.appid);
    }
  }

  console.log(
    `К добавлению: ${toAdd.length} карт (пропуск JSON/данных: ${skippedJson}, не собралось в карту: ${skippedBuild}).`,
  );

  if (toAdd.length === 0) {
    console.log("Нечего добавить (уже все appid из пула есть в коллекции).");
    await prisma.$disconnect();
    return;
  }

  const openedAt = new Date().toISOString();
  for (let i = 0; i < toAdd.length; i += PACK) {
    const chunk = toAdd.slice(i, i + PACK);
    state.pulls.push({
      id: randomUUID(),
      openedAt,
      cards: chunk,
    });
    addCardsToSpareCopies(state, chunk);
  }

  syncAchievements(state);

  await prisma.gameSave.upsert({
    where: { userId: user.id },
    create: { userId: user.id, payload: JSON.stringify(state) },
    update: { payload: JSON.stringify(state) },
  });

  console.log(
    `Готово: ${email} — добавлено ${toAdd.length} карт (${Math.ceil(toAdd.length / PACK)} записей паков).`,
  );

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
