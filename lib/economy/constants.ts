/** Бесплатных стандартных паков за локальный календарный день (без учёта почасового банка) */
export const FREE_PACKS_PER_DAY = 8;
/** Максимум паков, накапливаемых из «+1 за час» (не показывать в UI) */
export const HOURLY_PACK_MAX_BANK = 96;
/** Сколько полных часов начислить за раз после долгого оффлайна */
export const HOURLY_PACK_CATCH_UP_HOURS = 48;
/**
 * Верхний предел открытий любых паков за локальный день (только код, не UI).
 */
export const PACK_OPENS_DAILY_CAP = 100;
/** Монет за первый заход в новый день */
export const DAILY_LOGIN_COINS = 16;
/** Питти: после стольких паков без rare+ гарантируется rare или выше */
export const PITY_PACKS = 8;
/** Пыль за переработку 3 копий одной игры */
export const DUST_PER_TRIPLE_SALVAGE = 18;
/** Стоимость переброса одной карты в последнем паке */
export const DUST_REROLL_SLOT = 9;
