/** `holo` = HR / ZR в терминологии TCG: высокий голографический тир между SR и UR. */
export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "holo"
  | "legend";

export type AppMetrics = {
  positivePercent: number;
  /** Есть сигнал пользовательских отзывов Steam (иначе % не выдумываем). */
  hasUserReviews: boolean;
  metacritic: number | null;
  priceFinalUsd: number;
  reviewCount: number;
  shortDescriptionLength: number;
  releaseDateMs: number | null;
};

export type SteamCard = {
  appid: number;
  name: string;
  headerImage: string;
  storeUrl: string;
  rarity: Rarity;
  atk: number;
  def: number;
  /** HP для шапки карты; считается вместе с atk/def от редкости и score. */
  hp: number;
  score: number;
  positivePercent: number;
  metacritic: number | null;
  /** Пользовательские отзывы Steam. */
  hasUserReviews: boolean;
  /**
   * Число отзывов из recommendations.total; −1 = старые сохранения без поля (не показываем число).
   */
  reviewCount: number;
  /** Дата релиза (мс) из Steam; нужна чтобы при загрузке из localStorage совпадала редкость с моментом выпадения. */
  releaseDateMs: number | null;
  /** review_score_desc из Store API */
  reviewScoreDesc: string | null;
  /** Жанры из Steam (описания), могут быть пустыми */
  genres: string[];
};
