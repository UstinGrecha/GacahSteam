export type AchievementDef = {
  id: string;
  target: number;
  /** Разовая награда монетами при первой разблокировке */
  coinReward?: number;
  /** До разблокировки в UI показываются «???» */
  hidden?: boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_pack", target: 1, coinReward: 32 },
  { id: "packs_10", target: 10, coinReward: 48 },
  { id: "packs_50", target: 50, coinReward: 150 },
  { id: "unique_10", target: 10, coinReward: 38 },
  { id: "unique_50", target: 50, coinReward: 115 },
  { id: "cards_100", target: 100, coinReward: 55 },
  { id: "first_legend", target: 1, coinReward: 220 },
  { id: "streak_3", target: 3, coinReward: 28 },
  { id: "streak_7", target: 7, coinReward: 80 },
  {
    id: "first_rare_plus_pity",
    target: 1,
    coinReward: 18,
    hidden: true,
  },
  { id: "salvage_first", target: 1, coinReward: 30, hidden: true },
  { id: "dust_hoard_100", target: 100, coinReward: 48, hidden: true },
];
