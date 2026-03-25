export type AppLocale = "en" | "ru" | "ja" | "zh";

export type AchievementCopy = { title: string; description: string };

export type BoosterFaceCopy = {
  badge: string;
  title1: string;
  title2: string;
  tear: string;
  cardsWord: string;
  footer: string;
};

export type Messages = {
  meta: { title: string; description: string };
  nav: {
    brand: string;
    pack: string;
    collection: string;
    stats: string;
    achievements: string;
    settings: string;
    coins: string;
    coinsTitle: string;
  };
  legal: {
    line1: string;
    line2: string;
    line3: string;
  };
  home: { title: string };
  rarity: {
    common: string;
    uncommon: string;
    rare: string;
    epic: string;
    holo: string;
    legend: string;
  };
  gameCard: {
    baseGame: string;
    typeSteam: string;
    attack: string;
    defense: string;
    weakness: string;
    resist: string;
    retreat: string;
    resistValue: string;
    metacriticShort: string;
    positivePercent: string;
    noUserReviewsSteam: string;
    reviewsTotal: string;
    store: string;
    /** Запасной подпись в блоке метрик, без товарного знака */
    metricsFallback: string;
  };
  pack: {
    kindLabel: string;
    standard: string;
    budget: string;
    premium: string;
    hintSummary: string;
    loading: string;
    tearing: string;
    openStandardFree: string;
    noFreeLeft: string;
    openForCoins: string;
    rerolling: string;
    rerollSlot: string;
    errRefreshDay: string;
    errStandardExhausted: string;
    errNeedCoins: string;
    errReroll: string;
    errReplace: string;
    errOpen: string;
    /** Только dev: витрина всех редкостей */
    debugAllRarities: string;
    debugAllRaritiesSub: string;
  };
  deck: {
    prev: string;
    next: string;
    done: string;
    ariaPrev: string;
    ariaNext: string;
    ariaClose: string;
    ariaDot: string;
    section: string;
    controlsRegion: string;
    dotList: string;
    hint: string;
  };
  booster: {
    opened: string;
    tearLong: string;
    tearShort: string;
    gacha: string;
    /** Короткая пометка на макете пака (не логотип Steam) */
    packMark: string;
    standard: BoosterFaceCopy;
    budget: BoosterFaceCopy;
    premium: BoosterFaceCopy;
  };
  collection: {
    title: string;
    summary: string;
    searchPh: string;
    allRarities: string;
    salvageTitle: string;
    salvageHint: string;
    copies: string;
    salvageBtn: string;
    empty: string;
    packHistory: string;
    cardsWord: string;
    uniqueAbbr: string;
  };
  stats: {
    title: string;
    subtitle: string;
    packs: string;
    totalCards: string;
    uniqueGames: string;
    rarities: string;
    favoriteGenre: string;
    favoriteGenreHint: string;
  };
  achievements: {
    pageTitle: string;
    subtitle: string;
    hidden: string;
    hiddenDesc: string;
    defs: Record<string, AchievementCopy>;
  };
  settings: {
    title: string;
    subtitle: string;
    language: string;
    languageHint: string;
    exportTitle: string;
    exportDesc: string;
    download: string;
    import: string;
    confirmImport: string;
    msgSaved: string;
    msgBadJson: string;
    msgImported: string;
    resetTitle: string;
    resetDesc: string;
    resetButton: string;
    confirmReset: string;
    msgReset: string;
  };
};

export const LOCALE_STORAGE_KEY = "steamgacha.locale";

/** Native names for the language selector */
export const LOCALE_NATIVE: Record<AppLocale, string> = {
  en: "English",
  ru: "Русский",
  ja: "日本語",
  zh: "简体中文",
};

export function localeToBcp47(locale: AppLocale): string {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "ja":
      return "ja-JP";
    case "zh":
      return "zh-CN";
    default:
      return "en-US";
  }
}
