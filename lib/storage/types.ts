import type { SteamCard } from "@/lib/gacha/types";

export type PullRecord = {
  id: string;
  openedAt: string;
  cards: SteamCard[];
};

export type AchievementEntry = {
  progress: number;
  unlockedAt: string | null;
  /** Разовая награда монетами уже выдана при разблокировке */
  coinRewardClaimed?: boolean;
};

export type AchievementMap = Record<string, AchievementEntry>;

export type StoredStateV2 = {
  version: 2;
  pulls: PullRecord[];
  achievements: AchievementMap;
  lastLoginDay: string | null;
  loginStreak: number;
  coins: number;
  /**
   * Календарный день `YYYY-MM-DD`, дневные бесплатные стандартные (до FREE_PACKS_PER_DAY)
   * и счётчик открытий паков за день (статистика / достижения).
   */
  daily: {
    date: string;
    freePacksUsed: number;
    packsOpenedToday: number;
  };
  /**
   * Почасовое начисление в bank (+1 стандартный пак за полный час, с лимитом догона);
   * вместе с дневным остатком не больше FREE_PACKS_PER_DAY.
   */
  hourly: { lastHourIndex: number; bank: number };
  /** Счётчик паков без карты rare+; при достижении порога — питти */
  pity: { packsSinceRarePlus: number };
  dust: number;
  /** Доступные копии по appid (для переработки); синхронизируется с addPull и salvage */
  spareCopies: Record<string, number>;
  /** Сколько раз сработала питти (гарантированный rare+) */
  pityActivations: number;
  /** Сколько раз переработали тройку копий */
  salvageCount: number;
  /** Награда за рейд: неделя UTC (ключ как у `currentRaidWeekKey`), за которую уже выдан трофей. */
  raid: { lastRewardWeekKey: string | null };
};

export type StoredState = StoredStateV2;
