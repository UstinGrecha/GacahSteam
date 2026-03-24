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

export const ja: Messages = {
  meta: {
    title: "SteamGacha",
    description: "Steamゲームのガチャパック：コレクションと実績。",
  },
  nav: {
    pack: "パック",
    collection: "コレクション",
    stats: "統計",
    achievements: "実績",
    settings: "設定",
    coins: "コイン",
    coinsTitle: "コイン",
  },
  home: {
    title: "Steamパックを開ける",
    subtitle:
      "Steamストアのデータからレア度とステータス付きのゲームカードが5枚。",
  },
  rarity: {
    common: "コモン",
    uncommon: "アンコモン",
    rare: "レア",
    epic: "スーパーレア",
    holo: "ホロレア（HR / ZR）",
    legend: "ウルトラレア",
  },
  gameCard: {
    baseGame: "基本ゲーム",
    typeSteam: "タイプ: Steam",
    attack: "攻撃",
    defense: "防御",
    weakness: "弱点",
    resist: "抵抗",
    retreat: "退却",
    resistValue: "ノイズ −{{n}}",
    metacriticShort: "Metacritic {{n}}",
    positivePercent: "好評 {{n}}%",
    noUserReviewsSteam: "Steamにユーザー評価なし",
    reviewsTotal: "レビュー {{n}}件",
    store: "Steam",
  },
  pack: {
    kindLabel: "パックの種類",
    standard: "スタンダード",
    budget: "バジェット",
    premium: "プレミアム",
    hintMain:
      "スタンダードは無料枠のみ（本日 {{freeLeft}}/{{freeMax}}）。バジェット20・プレミアム40コイン。{{pity}}パック連続でレア+なしのときピティ。",
    hintCoinsLabel: "コイン:",
    hintDustLabel: "ダスト:",
    loading: "カードを引いています…",
    tearing: "パックを開封中…",
    openStandardFree: "スタンダードパックを開ける（無料）",
    noFreeLeft: "無料枠なし",
    openForCoins: "{{n}} コインで開封",
    rerolling: "振り直し中…",
    rerollSlot: "ランダムでカード振り直し（ダスト {{n}}）",
    errRefreshDay: "ページを更新してください — 日付が変わりました。",
    errStandardExhausted:
      "本日の無料スタンダードは使い切りました（{{max}}/{{max}}）。明日リセット。",
    errNeedCoins: "コインが {{cost}} 必要です。",
    errReroll: "振り直しエラー",
    errReplace: "差し替えに失敗しました — 再試行してください。",
    errOpen: "パックを開けませんでした。",
    debugAllRarities: "デバッグ：全レアリティ",
    debugAllRaritiesSub:
      "6枚・プールからティアごとに1枚（厳格ルール）、コイン・デイリー消費なし",
  },
  deck: {
    prev: "← 戻る",
    next: "次へ →",
    done: "完了",
    ariaPrev: "前のカード",
    ariaNext: "次のカード",
    ariaClose: "カード表示を閉じる",
    ariaDot: "カード {{n}}",
    section: "あなたのデッキ",
    controlsRegion: "デッキ操作",
    dotList: "カード番号",
    hint: "左スワイプで次、最後で閉じる。右で戻る。Escで閉じる。",
  },
  booster: {
    opened: "パック開封済み",
    tearLong: "切り取り線",
    tearShort: "切り取り",
    gacha: "GACHA",
    standard: face(
      "シリーズ I",
      "コレクター",
      "セット",
      "切り取り線",
      "枚",
      "ランダムなSteamゲーム · 再販禁止",
    ),
    budget: face(
      "エコノミー",
      "ベーシック",
      "ロット",
      "切り取り",
      "枚",
      "バジェットプール · 保証なし",
    ),
    premium: face(
      "エリート",
      "プレミアム",
      "コレクション",
      "切り取り線",
      "枚",
      "レア率アップ · Steam",
    ),
  },
  collection: {
    title: "コレクション",
    summary:
      "カード合計: {{cards}}。ユニークゲーム: {{unique}}。パック: {{packs}}。",
    searchPh: "名前で検索…",
    allRarities: "すべてのレア度",
    salvageTitle: "重複を還元",
    salvageHint:
      "同一ゲームの余剰コピー3つ → ダスト +{{dust}}。パック履歴は消えません。",
    copies: "コピー:",
    salvageBtn: "還元 ×3",
    empty: "まだありません — ホームでパックを開けてください。",
    packHistory: "パック履歴",
    cardsWord: "枚",
    uniqueAbbr: "ユニーク",
  },
  stats: {
    title: "統計",
    subtitle: "このブラウザで開いたすべてのパックから集計。",
    packs: "パック数",
    totalCards: "カード合計",
    uniqueGames: "ユニークゲーム",
    rarities: "レア度",
    favoriteGenre: "お気に入りジャンル",
    favoriteGenreHint:
      "Steamデータでそのジャンルのカード枚数が多い順。空ならアップデート後に新規パックを。",
  },
  achievements: {
    pageTitle: "実績",
    subtitle: "進行状況はこのブラウザ内のみ保存されます。",
    hidden: "???",
    hiddenDesc: "隠し実績。",
    defs: {
      first_pack: {
        title: "初めてのパック",
        description: "パックを1回開ける。",
      },
      packs_10: {
        title: "10パック",
        description: "パックを10回開ける。",
      },
      packs_50: {
        title: "パックハンター",
        description: "パックを50回開ける。",
      },
      unique_10: {
        title: "バラエティ",
        description: "異なるゲームを10タイトル集める。",
      },
      unique_50: {
        title: "コレクター",
        description: "異なるゲームを50タイトル集める。",
      },
      cards_100: {
        title: "100枚",
        description: "カードを合計100枚入手。",
      },
      first_legend: {
        title: "レジェンド",
        description: "レジェンドレアのカードを1枚引く。",
      },
      streak_3: {
        title: "3日連続",
        description: "3日連続でログイン。",
      },
      streak_7: {
        title: "Steamウィーク",
        description: "7日連続でログイン。",
      },
      first_rare_plus_pity: {
        title: "ピティの幸運",
        description: "ピティが1回発動（レア+スロット）。",
      },
      salvage_first: {
        title: "還元職人",
        description: "初めて同一ゲームのコピー3枚をダストに還元。",
      },
      dust_hoard_100: {
        title: "ダスト貯金",
        description: "ダストを100貯める。",
      },
    },
  },
  settings: {
    title: "設定",
    subtitle: "ローカルセーブのバックアップと復元。",
    language: "言語",
    languageHint: "このブラウザではアプリ全体に適用されます。",
    exportTitle: "エクスポート / インポート",
    exportDesc:
      "ファイルには全進行（パック、コイン、ダスト、実績）が含まれます。ネタバレを避けるなら公開しないでください。",
    download: "JSONをダウンロード",
    import: "インポート…",
    confirmImport:
      "このブラウザのデータをファイルの内容で置き換えますか？現在のコレクションは失われます。",
    msgSaved: "保存しました。",
    msgBadJson: "JSONが無効か、バージョン2ではありません。",
    msgImported: "インポート完了。",
    resetTitle: "セーブのリセット",
    resetDesc:
      "このブラウザのコレクション・コイン・ダスト・ピティ・実績を削除します。言語設定は残ります。",
    resetButton: "データをリセット",
    confirmReset:
      "ローカルのゲームセーブをすべて削除しますか？元に戻せません。",
    msgReset: "リセットしました。",
  },
};
