"use client";

import { useI18n } from "@/components/I18nProvider";
import type { AppLocale } from "@/lib/i18n/types";
import { LOCALE_NATIVE } from "@/lib/i18n/types";

const LOCALES: AppLocale[] = ["en", "ru", "ja", "zh"];

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-50">{t("settings.title")}</h1>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          {t("settings.language")}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">{t("settings.languageHint")}</p>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as AppLocale)}
          className="mt-3 w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none sm:max-w-sm"
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_NATIVE[code]}
            </option>
          ))}
        </select>
      </section>
    </main>
  );
}
