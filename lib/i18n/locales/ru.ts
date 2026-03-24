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

export const ru: Messages = {
  meta: {
    title: "SteamGacha",
    description: "Гача-паки из игр Steam: коллекция и достижения.",
  },
  nav: {
    pack: "Пак",
    collection: "Коллекция",
    stats: "Статистика",
    achievements: "Достижения",
    settings: "Настройки",
    coins: "мон.",
    coinsTitle: "Монеты",
  },
  home: {
    title: "Откройте пак из Steam",
    subtitle:
      "Пять карточек-игр с редкостью и статами из данных магазина Steam.",
  },
  rarity: {
    common: "Обычная",
    uncommon: "Необычная",
    rare: "Редкая",
    epic: "Супер редкая",
    holo: "Голографическая редкость (HR / ZR)",
    legend: "Ультра редкая",
  },
  gameCard: {
    baseGame: "Базовая игра",
    typeSteam: "Тип: Steam",
    attack: "Атака",
    defense: "Защита",
    weakness: "Слабость",
    resist: "Сопрот.",
    retreat: "Отступ",
    resistValue: "−{{n}} шум",
    metacriticShort: "Metacritic {{n}}",
    positivePercent: "{{n}}% положительных",
    noUserReviewsSteam: "Нет пользовательских отзывов в Steam",
    reviewsTotal: "{{n}} отзывов",
    store: "Steam",
  },
  pack: {
    kindLabel: "Тип пака",
    standard: "Стандарт",
    budget: "Дешёвый",
    premium: "Премиум",
    hintMain:
      "Стандарт — только бесплатные попытки ({{freeLeft}}/{{freeMax}} сегодня). Дешёвый 20 · премиум 40 монет. Питти rare+ каждые {{pity}} паков без rare+.",
    hintCoinsLabel: "Монеты:",
    hintDustLabel: "Пыль:",
    loading: "Достаём карты…",
    tearing: "Рвём пак…",
    openStandardFree: "Открыть стандартный пак (бесплатно)",
    noFreeLeft: "Нет бесплатных попыток",
    openForCoins: "Открыть за {{n}} монет",
    rerolling: "Переброс…",
    rerollSlot: "Случайный переброс карты ({{n}} пыли)",
    errRefreshDay: "Обновите страницу — сменился игровой день.",
    errStandardExhausted:
      "Бесплатные стандартные паки на сегодня закончились ({{max}}/{{max}}). Завтра лимит обновится.",
    errNeedCoins: "Нужно {{cost}} монет.",
    errReroll: "Ошибка переброса",
    errReplace: "Не удалось получить замену — попробуйте снова.",
    errOpen: "Ошибка открытия пака",
    debugAllRarities: "Отладка: все редкости",
    debugAllRaritiesSub:
      "6 карт — по одной на тир из пула (жёсткие правила), без монет и дневного лимита",
  },
  deck: {
    prev: "← Назад",
    next: "Дальше →",
    done: "Готово",
    ariaPrev: "Предыдущая карта",
    ariaNext: "Следующая карта",
    ariaClose: "Закрыть просмотр карт",
    ariaDot: "Карта {{n}}",
    section: "Ваша колода",
    controlsRegion: "Управление колодой",
    dotList: "Номер карты",
    hint: "Свайп влево — следующая карта; на последней — закрыть колоду. Вправо — назад. Esc — закрыть.",
  },
  booster: {
    opened: "Пак открыт",
    tearLong: "отрывная линия",
    tearShort: "отрыв",
    gacha: "GACHA",
    standard: face(
      "Серия I",
      "Коллекционный",
      "набор",
      "отрывная линия",
      "карт",
      "Случайные игры Steam · не для перепродажи",
    ),
    budget: face(
      "Эконом",
      "Базовый",
      "лот",
      "отрыв",
      "карт",
      "Дешёвый пул · без гарантий",
    ),
    premium: face(
      "Elite",
      "Премиум",
      "коллекция",
      "отрывная линия",
      "карт",
      "Повышенный шанс редких · Steam",
    ),
  },
  collection: {
    title: "Коллекция",
    summary:
      "Всего карточек: {{cards}}. Уникальных игр: {{unique}}. Паков: {{packs}}.",
    searchPh: "Поиск по названию…",
    allRarities: "Все редкости",
    salvageTitle: "Переработка дубликатов",
    salvageHint:
      "Три свободные копии одной игры → +{{dust}} пыли. Счётчик копий не уменьшает историю паков.",
    copies: "копий:",
    salvageBtn: "Переработать ×3",
    empty: "Пока пусто — откройте пак на главной.",
    packHistory: "История паков",
    cardsWord: "карт",
    uniqueAbbr: "уник.",
  },
  stats: {
    title: "Статистика",
    subtitle: "Считается по всем открытым пакам в этом браузере.",
    packs: "Паков",
    totalCards: "Карт всего",
    uniqueGames: "Уникальных игр",
    rarities: "Редкости",
    favoriteGenre: "Любимый жанр",
    favoriteGenreHint:
      "По числу карточек с этим жанром в данных Steam. Если жанров нет — откройте новые паки после обновления.",
  },
  achievements: {
    pageTitle: "Достижения",
    subtitle: "Прогресс считается локально в этом браузере.",
    hidden: "???",
    hiddenDesc: "Скрытое достижение.",
    defs: {
      first_pack: {
        title: "Первый пак",
        description: "Откройте один пак.",
      },
      packs_10: {
        title: "Десяток паков",
        description: "Откройте 10 паков.",
      },
      packs_50: {
        title: "Охотник за паками",
        description: "Откройте 50 паков.",
      },
      unique_10: {
        title: "Разнообразие",
        description: "Соберите 10 разных игр.",
      },
      unique_50: {
        title: "Коллекционер",
        description: "Соберите 50 разных игр.",
      },
      cards_100: {
        title: "Сотня карточек",
        description: "Получите 100 карточек всего.",
      },
      first_legend: {
        title: "Легенда",
        description: "Выпадите карточку легендарной редкости.",
      },
      streak_3: {
        title: "Три дня подряд",
        description: "Заходите 3 дня подряд.",
      },
      streak_7: {
        title: "Неделя Steam",
        description: "Заходите 7 дней подряд.",
      },
      first_rare_plus_pity: {
        title: "Удача питти",
        description:
          "Один раз сработала гарантия питти (подбор слота под rare+).",
      },
      salvage_first: {
        title: "Переработчик",
        description:
          "Первый раз переработайте 3 копии одной игры в пыль.",
      },
      dust_hoard_100: {
        title: "Запас пыли",
        description: "Накопите 100 пыли.",
      },
    },
  },
  settings: {
    title: "Настройки",
    subtitle: "Резервная копия и восстановление локального сохранения.",
    language: "Язык",
    languageHint: "Для всего приложения в этом браузере.",
    exportTitle: "Экспорт / импорт",
    exportDesc:
      "Файл содержит всю прогрессию (паки, монеты, пыль, ачивки). Не делитесь им публично, если не хотите спойлеров.",
    download: "Скачать JSON",
    import: "Импортировать…",
    confirmImport:
      "Заменить все данные в этом браузере содержимым файла? Текущая коллекция пропадёт.",
    msgSaved: "Файл сохранён.",
    msgBadJson: "Неверный формат JSON или не версия 2.",
    msgImported: "Импорт выполнен.",
    resetTitle: "Сброс сохранения",
    resetDesc:
      "Удалить коллекцию, монеты, пыль, питти и достижения в этом браузере. Выбор языка останется.",
    resetButton: "Сбросить данные",
    confirmReset:
      "Удалить всё локальное сохранение игры? Это действие нельзя отменить.",
    msgReset: "Данные сброшены.",
  },
};
