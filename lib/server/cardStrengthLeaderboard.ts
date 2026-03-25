import { steamCardFromLeaderboardRaw } from "@/lib/gacha/steamCardFromLeaderboardRaw";
import type { SteamCard } from "@/lib/gacha/types";
import { getPrisma } from "@/lib/db/prisma";

export type StrongestCardLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  image: string | null;
  cardName: string;
  atk: number;
  def: number;
  hp: number;
  total: number;
  /** Полные данные для превью карты в UI */
  card: SteamCard;
};

function leaderDisplayName(user: { name: string | null; email: string }): string {
  if (user.name?.trim()) return user.name.trim();
  const at = user.email.indexOf("@");
  return at > 0 ? user.email.slice(0, at) : user.email;
}

/**
 * Только чтение сырых полей из JSON — без normalizePullsCards (она может кинуть на битых картах).
 */
export function maxCardStrengthFromPayload(payload: string): {
  cardName: string;
  atk: number;
  def: number;
  hp: number;
  total: number;
  card: SteamCard;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const pulls = (parsed as { pulls?: unknown }).pulls;
  if (!Array.isArray(pulls)) return null;

  let best: {
    cardName: string;
    atk: number;
    def: number;
    hp: number;
    total: number;
    card: SteamCard;
  } | null = null;

  for (const pull of pulls) {
    if (!pull || typeof pull !== "object") continue;
    const cards = (pull as { cards?: unknown }).cards;
    if (!Array.isArray(cards)) continue;
    for (const c of cards) {
      if (!c || typeof c !== "object") continue;
      const o = c as Record<string, unknown>;
      const card = steamCardFromLeaderboardRaw(o);
      if (!card) continue;
      const total = card.atk + card.def + card.hp;
      if (!best || total > best.total) {
        best = {
          cardName: card.name,
          atk: card.atk,
          def: card.def,
          hp: card.hp,
          total,
          card,
        };
      }
    }
  }
  return best;
}

export async function getStrongestCardLeaderboard(
  limit = 10,
): Promise<StrongestCardLeaderboardRow[]> {
  const prisma = getPrisma();
  const rows = await prisma.gameSave.findMany({
    include: { user: true },
  });
  const scored: Omit<StrongestCardLeaderboardRow, "rank">[] = [];
  for (const row of rows) {
    try {
      const best = maxCardStrengthFromPayload(row.payload);
      if (!best || best.total <= 0) continue;
      scored.push({
        userId: row.userId,
        displayName: leaderDisplayName(row.user),
        image: row.user.image,
        cardName: best.cardName,
        atk: best.atk,
        def: best.def,
        hp: best.hp,
        total: best.total,
        card: best.card,
      });
    } catch {
      /* пропускаем повреждённое сохранение */
    }
  }
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.displayName.localeCompare(b.displayName, "en");
  });
  return scored.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
}
