import type { AchievementMap, StoredState } from "@/lib/storage/types";
import { ACHIEVEMENTS } from "./definitions";

function merge(
  map: AchievementMap,
  id: string,
  rawProgress: number,
  target: number,
): void {
  const prev = map[id] ?? {
    progress: 0,
    unlockedAt: null,
    coinRewardClaimed: false,
  };
  const progress = Math.min(target, Math.max(prev.progress, rawProgress));
  let unlockedAt = prev.unlockedAt;
  if (!unlockedAt && progress >= target) {
    unlockedAt = new Date().toISOString();
  }
  map[id] = {
    progress,
    unlockedAt,
    coinRewardClaimed: prev.coinRewardClaimed ?? false,
  };
}

/** Recomputes achievement progress from pulls + streak; mutates state.achievements. */
export function syncAchievements(state: StoredState): StoredState {
  const next = { ...state.achievements };
  const packCount = state.pulls.length;
  const allCards = state.pulls.flatMap((p) => p.cards);
  const totalCards = allCards.length;
  const uniqueGames = new Set(allCards.map((c) => c.appid)).size;
  const legendPulled = allCards.some((c) => c.rarity === "legend") ? 1 : 0;
  const streak = state.loginStreak ?? 0;

  merge(next, "first_pack", packCount, 1);
  merge(next, "packs_10", packCount, 10);
  merge(next, "packs_50", packCount, 50);
  merge(next, "unique_10", uniqueGames, 10);
  merge(next, "unique_50", uniqueGames, 50);
  merge(next, "cards_100", totalCards, 100);
  merge(next, "first_legend", legendPulled, 1);
  merge(next, "streak_3", streak, 3);
  merge(next, "streak_7", streak, 7);
  merge(next, "first_rare_plus_pity", state.pityActivations ?? 0, 1);
  merge(next, "salvage_first", state.salvageCount ?? 0, 1);
  {
    const prevDustProg = next["dust_hoard_100"]?.progress ?? 0;
    merge(
      next,
      "dust_hoard_100",
      Math.max(prevDustProg, state.dust),
      100,
    );
  }

  for (const def of ACHIEVEMENTS) {
    const reward = def.coinReward ?? 0;
    if (reward <= 0) continue;
    const e = next[def.id];
    if (!e?.unlockedAt || e.coinRewardClaimed) continue;
    state.coins += reward;
    next[def.id] = { ...e, coinRewardClaimed: true };
  }

  state.achievements = next;
  return state;
}
