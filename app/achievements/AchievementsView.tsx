"use client";

import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import { ACHIEVEMENTS } from "@/lib/achievements/definitions";

type AchievementsViewProps = { embedded?: boolean };

export function AchievementsView({ embedded = false }: AchievementsViewProps) {
  const { state } = useGameStorage();
  const { t, messages, bcp47 } = useI18n();

  const Root = embedded ? "section" : "main";
  const Title = embedded ? "h2" : "h1";

  return (
    <Root
      id={embedded ? "profile-achievements" : undefined}
      className={`flex flex-1 flex-col gap-6${embedded ? " scroll-mt-28 border-t border-zinc-800/80 pt-8" : ""}`}
    >
      <div>
        <Title
          className={
            embedded
              ? "text-xl font-bold text-zinc-50"
              : "text-2xl font-bold text-zinc-50"
          }
        >
          {t("achievements.pageTitle")}
        </Title>
        <p className="mt-1 text-sm text-zinc-400">
          {t("achievements.subtitle")}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {ACHIEVEMENTS.map((def) => {
          const row = state.achievements[def.id];
          const progress = row?.progress ?? 0;
          const unlocked = Boolean(row?.unlockedAt);
          const pct = Math.min(100, (progress / def.target) * 100);
          const masked = def.hidden && !unlocked;
          const copy = messages.achievements.defs[def.id];

          return (
            <li
              key={def.id}
              className={`rounded-xl border px-4 py-3 ${
                unlocked
                  ? "border-amber-500/40 bg-amber-950/20"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-zinc-100">
                    {masked ? t("achievements.hidden") : copy?.title ?? def.id}
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {masked
                      ? t("achievements.hiddenDesc")
                      : copy?.description ?? ""}
                  </p>
                </div>
                <div className="text-right text-sm tabular-nums text-zinc-400">
                  <span className="font-medium text-zinc-200">
                    {masked ? "?" : progress}
                  </span>
                  <span> / {def.target}</span>
                  {unlocked && row?.unlockedAt ? (
                    <p className="mt-1 text-xs text-amber-400/90">
                      {new Date(row.unlockedAt).toLocaleString(bcp47)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    unlocked ? "bg-amber-500" : "bg-sky-600"
                  }`}
                  style={{ width: `${masked ? 0 : pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Root>
  );
}
