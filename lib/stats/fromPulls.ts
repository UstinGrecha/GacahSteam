import type { Rarity } from "@/lib/gacha/types";
import type { PullRecord } from "@/lib/storage/types";

const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "holo",
  "legend",
  "champion",
];

export type CollectionStats = {
  packCount: number;
  totalCards: number;
  uniqueGames: number;
  byRarity: Record<Rarity, number>;
  favoriteGenre: string | null;
};

export function computeCollectionStats(pulls: PullRecord[]): CollectionStats {
  const byRarity = Object.fromEntries(
    RARITY_ORDER.map((r) => [r, 0]),
  ) as Record<Rarity, number>;
  const genreCounts = new Map<string, number>();
  let totalCards = 0;
  const appids = new Set<number>();

  for (const pull of pulls) {
    for (const c of pull.cards) {
      totalCards += 1;
      appids.add(c.appid);
      byRarity[c.rarity] += 1;
      for (const g of c.genres ?? []) {
        const key = g.trim();
        if (!key) continue;
        genreCounts.set(key, (genreCounts.get(key) ?? 0) + 1);
      }
    }
  }

  let favoriteGenre: string | null = null;
  let best = 0;
  for (const [g, n] of genreCounts) {
    if (n > best) {
      best = n;
      favoriteGenre = g;
    }
  }

  return {
    packCount: pulls.length,
    totalCards,
    uniqueGames: appids.size,
    byRarity,
    favoriteGenre,
  };
}
