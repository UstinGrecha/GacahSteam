/**
 * Распределение редкости по данным в SteamPoolEntry (как buildSteamCard).
 * Запуск: npx tsx scripts/stats-pool-rarity.ts
 */
import "dotenv/config";

import { buildSteamCard } from "@/lib/gacha/buildCard";
import type { Rarity } from "@/lib/gacha/types";
import { getPrisma } from "@/lib/db/prisma";
import type { SteamAppDetailsEntry } from "@/lib/steam/types";

const ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "holo",
  "legend",
  "champion",
];

async function main() {
  const prisma = getPrisma();
  const rows = await prisma.steamPoolEntry.findMany({
    where: { series: 1 },
    select: { appid: true, payloadJson: true },
  });

  const counts: Record<Rarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    holo: 0,
    legend: 0,
    champion: 0,
  };
  let skipped = 0;

  for (const row of rows) {
    let entry: SteamAppDetailsEntry;
    try {
      entry = JSON.parse(row.payloadJson) as SteamAppDetailsEntry;
    } catch {
      skipped += 1;
      continue;
    }
    if (!entry?.success || !entry.data) {
      skipped += 1;
      continue;
    }
    const card = buildSteamCard(row.appid, entry.data, {});
    if (!card) {
      skipped += 1;
      continue;
    }
    counts[card.rarity] += 1;
  }

  const total = rows.length;
  const built = total - skipped;
  console.log(`Серия 1: записей в БД ${total}, собрано в карту ${built}, не карта/битый JSON: ${skipped}\n`);

  for (const r of ORDER) {
    const n = counts[r];
    const pct = built > 0 ? ((n / built) * 100).toFixed(2) : "0.00";
    console.log(`  ${r.padEnd(10)} ${String(n).padStart(6)}  (${pct}%)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
