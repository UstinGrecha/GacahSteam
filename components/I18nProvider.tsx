"use client";

import { DICTS } from "@/lib/i18n/dictionaries";
import { applyParams } from "@/lib/i18n/format";
import { lookup } from "@/lib/i18n/lookup";
import type { Messages } from "@/lib/i18n/types";
import {
  LOCALE_STORAGE_KEY,
  localeToBcp47,
  type AppLocale,
} from "@/lib/i18n/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "ru";
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw === "en" || raw === "ru" || raw === "ja" || raw === "zh") return raw;
  return "ru";
}

type Ctx = {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  messages: Messages;
  bcp47: string;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("ru");

  useEffect(() => {
    const stored = readStoredLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync locale from localStorage after hydration
    setLocaleState((prev) => (prev === stored ? prev : stored));
  }, []);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const messages = DICTS[locale];
  const bcp47 = localeToBcp47(locale);

  useEffect(() => {
    document.documentElement.lang = bcp47;
  }, [bcp47]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      const raw = lookup(messages, path);
      const s = typeof raw === "string" ? raw : path;
      return applyParams(s, params);
    },
    [messages],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, messages, bcp47 }),
    [locale, setLocale, t, messages, bcp47],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
