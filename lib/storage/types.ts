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
  /** Календарный день UTC `YYYY-MM-DD` и число бесплатных паков за этот день */
  daily: { date: string; freePacksUsed: number };
  /** Счётчик паков без карты rare+; при достижении порога — питти */
  pity: { packsSinceRarePlus: number };
  dust: number;
  /** Доступные копии по appid (для переработки); синхронизируется с addPull и salvage */
  spareCopies: Record<string, number>;
  /** Сколько раз сработала питти (гарантированный rare+) */
  pityActivations: number;
  /** Сколько раз переработали тройку копий */
  salvageCount: number;
};

export type StoredState = StoredStateV2;
