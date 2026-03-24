import type { Messages } from "../types";

const face = (
  badge: string,
  title1: string,
  title2: string,
  tear: string,
  cardsWord: string,
  footer: string,
): Messages["booster"]["standard"] => ({
  badge,
  title1,
  title2,
  tear,
  cardsWord,
  footer,
});

export const en: Messages = {
  meta: {
    title: "SteamGacha",
    description: "Steam game gacha packs: collection and achievements.",
  },
  nav: {
    pack: "Pack",
    collection: "Collection",
    stats: "Stats",
    achievements: "Achievements",
    settings: "Settings",
    coins: "c.",
    coinsTitle: "Coins",
  },
  home: {
    title: "Open a Steam pack",
    subtitle:
      "Five game cards with rarity and stats from Steam store data.",
  },
  rarity: {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Super Rare",
    holo: "Holo Rare (HR / ZR)",
    legend: "Ultra Rare",
  },
  gameCard: {
    baseGame: "Base game",
    typeSteam: "Type: Steam",
    attack: "Attack",
    defense: "Defense",
    weakness: "Weakness",
    resist: "Resist.",
    retreat: "Retreat",
    resistValue: "-{{n}} noise",
    metacriticShort: "Metacritic {{n}}",
    positivePercent: "{{n}}% positive",
    noUserReviewsSteam: "No user reviews on Steam",
    reviewsTotal: "{{n}} reviews",
    store: "Steam",
  },
  pack: {
    kindLabel: "Pack type",
    standard: "Standard",
    budget: "Budget",
    premium: "Premium",
    hintMain:
      "Standard — free pulls only ({{freeLeft}}/{{freeMax}} today). Budget 20 · Premium 40 coins. Pity rare+ every {{pity}} packs without rare+.",
    hintCoinsLabel: "Coins:",
    hintDustLabel: "Dust:",
    loading: "Drawing cards…",
    tearing: "Opening pack…",
    openStandardFree: "Open standard pack (free)",
    noFreeLeft: "No free pulls left",
    openForCoins: "Open for {{n}} coins",
    rerolling: "Rerolling…",
    rerollSlot: "Random card reroll ({{n}} dust)",
    errRefreshDay: "Refresh the page — the game day has changed.",
    errStandardExhausted:
      "Free standard packs for today are used ({{max}}/{{max}}). Resets tomorrow.",
    errNeedCoins: "You need {{cost}} coins.",
    errReroll: "Reroll error",
    errReplace: "Could not get a replacement — try again.",
    errOpen: "Failed to open pack.",
    debugAllRarities: "Debug: all rarities",
    debugAllRaritiesSub:
      "6 cards — one per tier from pool (strict checkpoint rules), no coins or daily limit",
  },
  deck: {
    prev: "← Back",
    next: "Next →",
    done: "Done",
    ariaPrev: "Previous card",
    ariaNext: "Next card",
    ariaClose: "Close card view",
    ariaDot: "Card {{n}}",
    section: "Your deck",
    controlsRegion: "Deck controls",
    dotList: "Card index",
    hint: "Swipe left — next card; on the last — close deck. Swipe right — back. Esc — close.",
  },
  booster: {
    opened: "Pack opened",
    tearLong: "Tear line",
    tearShort: "Tear",
    gacha: "GACHA",
    standard: face(
      "Series I",
      "Collector's",
      "set",
      "Tear line",
      "cards",
      "Random Steam games · not for resale",
    ),
    budget: face(
      "Economy",
      "Basic",
      "lot",
      "Tear",
      "cards",
      "Budget pool · no guarantees",
    ),
    premium: face(
      "Elite",
      "Premium",
      "collection",
      "Tear line",
      "cards",
      "Better rare odds · Steam",
    ),
  },
  collection: {
    title: "Collection",
    summary:
      "Total cards: {{cards}}. Unique games: {{unique}}. Packs: {{packs}}.",
    searchPh: "Search by name…",
    allRarities: "All rarities",
    salvageTitle: "Salvage duplicates",
    salvageHint:
      "Three spare copies of one game → +{{dust}} dust. Does not remove pack history.",
    copies: "copies:",
    salvageBtn: "Salvage ×3",
    empty: "Nothing here yet — open a pack on the home page.",
    packHistory: "Pack history",
    cardsWord: "cards",
    uniqueAbbr: "uniq.",
  },
  stats: {
    title: "Statistics",
    subtitle: "Based on all packs opened in this browser.",
    packs: "Packs",
    totalCards: "Total cards",
    uniqueGames: "Unique games",
    rarities: "Rarities",
    favoriteGenre: "Favorite genre",
    favoriteGenreHint:
      "By number of cards with this genre in Steam data. If empty — open new packs after an update.",
  },
  achievements: {
    pageTitle: "Achievements",
    subtitle: "Progress is tracked locally in this browser.",
    hidden: "???",
    hiddenDesc: "Hidden achievement.",
    defs: {
      first_pack: {
        title: "First pack",
        description: "Open one pack.",
      },
      packs_10: {
        title: "Ten packs",
        description: "Open 10 packs.",
      },
      packs_50: {
        title: "Pack hunter",
        description: "Open 50 packs.",
      },
      unique_10: {
        title: "Variety",
        description: "Collect 10 different games.",
      },
      unique_50: {
        title: "Collector",
        description: "Collect 50 different games.",
      },
      cards_100: {
        title: "Hundred cards",
        description: "Get 100 cards in total.",
      },
      first_legend: {
        title: "Legend",
        description: "Pull a legendary rarity card.",
      },
      streak_3: {
        title: "Three-day streak",
        description: "Log in 3 days in a row.",
      },
      streak_7: {
        title: "Steam week",
        description: "Log in 7 days in a row.",
      },
      first_rare_plus_pity: {
        title: "Pity luck",
        description:
          "Pity triggered once (slot forced to rare+).",
      },
      salvage_first: {
        title: "Salvager",
        description: "Salvage 3 copies of one game into dust for the first time.",
      },
      dust_hoard_100: {
        title: "Dust stash",
        description: "Reach 100 dust.",
      },
    },
  },
  settings: {
    title: "Settings",
    subtitle: "Backup and restore local save data.",
    language: "Language",
    languageHint: "Applies to the whole app in this browser.",
    exportTitle: "Export / import",
    exportDesc:
      "File contains all progress (packs, coins, dust, achievements). Do not share publicly if you care about spoilers.",
    download: "Download JSON",
    import: "Import…",
    confirmImport:
      "Replace all data in this browser with the file contents? Current collection will be lost.",
    msgSaved: "File saved.",
    msgBadJson: "Invalid JSON or not v2 format.",
    msgImported: "Import complete.",
    resetTitle: "Reset save data",
    resetDesc:
      "Remove collection, coins, dust, pity counters, and achievements in this browser. Language choice is kept.",
    resetButton: "Reset data",
    confirmReset:
      "Delete all local game save data? This cannot be undone.",
    msgReset: "Data cleared.",
  },
};
