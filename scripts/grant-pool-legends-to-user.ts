/**
 * Добавить в коллекцию аккаунта все карты уровня «ультра редкая» (legend / UR)
 * из SteamPoolEntry серии 1. Уже имеющиеся по appid не дублируются.
 *
 * Запуск: npx tsx scripts/grant-pool-legends-to-user.ts
 * Переменные: DATABASE_URL; опционально GRANT_LEGENDS_EMAIL (по умолчанию ниже).
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

function ownedAppIds(state: StoredState): Set<number> {
  const s = new Set<number>();
  for (const p of state.pulls) {
    for (const c of p.cards) s.add(c.appid);
  }
  return s;
}

async function main() {
  const email = (process.env.GRANT_LEGENDS_EMAIL ?? DEFAULT_EMAIL).trim();
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
  const legendCards: NonNullable<ReturnType<typeof buildSteamCard>>[] = [];

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
      let entry: SteamAppDetailsEntry;
      try {
        entry = JSON.parse(row.payloadJson) as SteamAppDetailsEntry;
      } catch {
        continue;
      }
      if (!entry?.success || !entry.data) continue;
      const card = buildSteamCard(row.appid, entry.data);
      if (card?.rarity === "legend" && !owned.has(card.appid)) {
        legendCards.push(card);
        owned.add(card.appid);
      }
    }
  }

  console.log(`В пуле найдено legend-карт к добавлению: ${legendCards.length}`);

  if (legendCards.length === 0) {
    console.log("Нечего добавлять (уже все есть или в пуле нет legend).");
    await prisma.$disconnect();
    return;
  }

  const openedAt = new Date().toISOString();
  const PACK = 5;
  for (let i = 0; i < legendCards.length; i += PACK) {
    const chunk = legendCards.slice(i, i + PACK);
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
    `Готово: ${email} — добавлено ${legendCards.length} карт (${Math.ceil(legendCards.length / PACK)} «паков»).`,
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
