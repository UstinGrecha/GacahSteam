"use client";

import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import {
  parseStoredStateJson,
  serializeStoredState,
} from "@/lib/storage/backup";
import { clearPersistedGameState, saveState } from "@/lib/storage/persist";
import type { AppLocale } from "@/lib/i18n/types";
import { LOCALE_NATIVE } from "@/lib/i18n/types";
import { SITE_BRAND } from "@/lib/siteBrand";
import { useCallback, useRef, useState } from "react";

const LOCALES: AppLocale[] = ["en", "ru", "ja", "zh"];

export function SettingsView() {
  const { state, refresh } = useGameStorage();
  const { t, locale, setLocale } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = useCallback(() => {
    const blob = new Blob([serializeStoredState(state)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${SITE_BRAND.toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg(t("settings.msgSaved"));
  }, [state, t]);

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMsg(null);
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const parsed = parseStoredStateJson(text);
        if (!parsed) {
          setMsg(t("settings.msgBadJson"));
          return;
        }
        if (!window.confirm(t("settings.confirmImport"))) {
          return;
        }
        saveState(parsed);
        refresh();
        setMsg(t("settings.msgImported"));
      };
      reader.readAsText(file);
    },
    [refresh, t],
  );

  const onReset = useCallback(() => {
    setMsg(null);
    if (!window.confirm(t("settings.confirmReset"))) return;
    clearPersistedGameState();
    refresh();
    setMsg(t("settings.msgReset"));
  }, [refresh, t]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("settings.subtitle")}</p>
      </div>

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

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          {t("settings.exportTitle")}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{t("settings.exportDesc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {t("settings.download")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            {t("settings.import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFile}
          />
        </div>
        {msg ? (
          <p className="mt-3 text-sm text-amber-200/90">{msg}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
        <h2 className="text-sm font-semibold text-red-200">
          {t("settings.resetTitle")}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{t("settings.resetDesc")}</p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-lg border border-red-700 bg-red-950/60 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-900/50"
        >
          {t("settings.resetButton")}
        </button>
      </section>
    </main>
  );
}
