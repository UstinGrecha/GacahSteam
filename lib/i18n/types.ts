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
    profile: string;
    raid: string;
    market: string;
    collection: string;
    stats: string;
    achievements: string;
    settings: string;
    coins: string;
    coinsTitle: string;
    login: string;
    authorization: string;
    logout: string;
  };
  auth: {
    title: string;
    subtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    signInGoogle: string;
    registerGoogle: string;
    emailLabel: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    confirmPasswordLabel: string;
    emailPlaceholder: string;
    signInSubmit: string;
    registerSubmit: string;
    haveAccount: string;
    needAccount: string;
    signOut: string;
    signedInAs: string;
    errorNoProviders: string;
    errorGeneric: string;
    errorEmailTaken: string;
    errorNicknameLength: string;
    errorPasswordLength: string;
    errorPasswordMatch: string;
    errorEmailInvalid: string;
  };
  legal: {
    line1: string;
    line2: string;
    line3: string;
  };
  home: { title: string };
  profile: {
    title: string;
    subtitle: string;
    sectionNav: string;
    leaderboard: {
      title: string;
      subtitle: string;
      loading: string;
      empty: string;
      loadError: string;
      noDatabase: string;
      rank: string;
      player: string;
      card: string;
      atk: string;
      def: string;
      hp: string;
      total: string;
      viewCard: string;
      closePreview: string;
    };
  };
  rarity: {
    common: string;
    uncommon: string;
    rare: string;
    epic: string;
    holo: string;
    legend: string;
    champion: string;
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
    /** Заголовок блока пассивных свойств карты */
    traits: string;
  };
  pack: {
    kindLabel: string;
    seriesSection: string;
    /** Подпись на паке: «Серия {{n}}» */
    seriesLabel: string;
    seriesPickHint: string;
    standard: string;
    budget: string;
    premium: string;
    hintSummary: string;
    loading: string;
    tearing: string;
    openStandardFree: string;
    noFreeLeft: string;
    openForCoins: string;
    /** Серия закрыта (временно), кнопка открытия */
    series2Soon: string;
    rerolling: string;
    rerollSlot: string;
    errRefreshDay: string;
    /** Скрытый дневной лимит открытий — без цифр в тексте */
    errPackUnavailable: string;
    errStandardExhausted: string;
    errNeedCoins: string;
    errReroll: string;
    errReplace: string;
    errOpen: string;
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
    sellBtn: string;
    sellHint: string;
    sellError: string;
    empty: string;
    packHistory: string;
    cardsWord: string;
    uniqueAbbr: string;
    carouselPrev: string;
    carouselNext: string;
    carouselSwipeHint: string;
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
  raid: {
    title: string;
    subtitle: string;
    week: string;
    bossHeading: string;
    bossHp: string;
    bossAtk: string;
    bossDef: string;
    squadTitle: string;
    squadHint: string;
    selected: string;
    toggleSelect: string;
    start: string;
    nextStep: string;
    autoPlay: string;
    stopAuto: string;
    reset: string;
    emptyCollection: string;
    needFive: string;
    logTitle: string;
    victory: string;
    defeat: string;
    phaseHeroes: string;
    phaseBoss: string;
    round: string;
    bossPhaseWarn: string;
    heroAttack: string;
    bossHit: string;
    bossNames: Record<string, string>;
    enrageBanner: string;
    enrageBar: string;
    summaryTitle: string;
    summaryTotalDmg: string;
    summaryMvp: string;
    summaryHeals: string;
    summaryHeroAttacks: string;
    summaryBossPhases: string;
    squadStrip: string;
    traitsHint: string;
    logHeal: string;
    logEnrageActive: string;
    speedNormal: string;
    speedFast: string;
    rewardTitle: string;
    rewardBody: string;
    rewardFail: string;
    rewardAlready: string;
    rewardPoolMissing: string;
    rewardCardFallback: string;
    rarityFilter: string;
    noCardsThisRarity: string;
  };
  market: {
    title: string;
    subtitle: string;
    browse: string;
    myOffers: string;
    sell: string;
    buy: string;
    price: string;
    seller: string;
    cancel: string;
    loginToTrade: string;
    loadError: string;
    empty: string;
    listTitle: string;
    priceHint: string;
    listButton: string;
    listed: string;
    bought: string;
    cancelled: string;
    ownBadge: string;
    needLoginBuy: string;
    needCoins: string;
    gone: string;
    tooManyListings: string;
    selectCardHint: string;
    close: string;
    refresh: string;
    sellNeedsServer: string;
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
