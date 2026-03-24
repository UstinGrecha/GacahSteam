import type { AppLocale } from "./types";
import type { Messages } from "./types";
import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";

export const DICTS: Record<AppLocale, Messages> = {
  en,
  ru,
  ja,
  zh,
};
