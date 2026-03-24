"use client";

import { useI18n } from "@/components/I18nProvider";
import { rarityTcgCode } from "@/components/rarityStyles";
import { useGameStorage } from "@/components/StorageProvider";
import { computeCollectionStats } from "@/lib/stats/fromPulls";
import type { Rarity } from "@/lib/gacha/types";
import { useMemo } from "react";

const ORDER: Rarity[] = [
  "legend",
  "holo",
  "epic",
  "rare",
  "uncommon",
  "common",
];

export function StatsView() {
  const { state } = useGameStorage();
  const { t, messages } = useI18n();
  const rl = messages.rarity;
  const stats = useMemo(
    () => computeCollectionStats(state.pulls),
    [state.pulls],
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{t("stats.title")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("stats.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            {t("stats.packs")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
            {stats.packCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            {t("stats.totalCards")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
            {stats.totalCards}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            {t("stats.uniqueGames")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
            {stats.uniqueGames}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {t("stats.rarities")}
        </h2>
        <ul className="mt-3 space-y-2">
          {ORDER.map((r) => {
            const n = stats.byRarity[r];
            const pct =
              stats.totalCards > 0
                ? Math.round((n / stats.totalCards) * 100)
                : 0;
            return (
              <li
                key={r}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-zinc-300">
                  <span className="mr-1.5 inline-block min-w-[1.75rem] font-mono text-xs font-bold text-zinc-400">
                    {rarityTcgCode(r)}
                  </span>
                  {rl[r]}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {n}{" "}
                  <span className="text-zinc-600">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {t("stats.favoriteGenre")}
        </h2>
        <p className="mt-2 text-lg font-medium text-zinc-200">
          {stats.favoriteGenre ?? "—"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          {t("stats.favoriteGenreHint")}
        </p>
      </section>
    </main>
  );
}
