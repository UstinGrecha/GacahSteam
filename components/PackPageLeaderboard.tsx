"use client";

import { GameCard } from "@/components/GameCard";
import { useI18n } from "@/components/I18nProvider";
import type { SteamCard } from "@/lib/gacha/types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Entry = {
  rank: number;
  userId: string;
  displayName: string;
  image: string | null;
  cardName: string;
  total: number;
  card: SteamCard;
};

type Props = { className?: string };

export function PackPageLeaderboard({ className = "" }: Props) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<"no_database" | "server" | null>(null);
  const [preview, setPreview] = useState<SteamCard | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/game/leaderboard", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.status === 503) {
          setError("no_database");
          setEntries([]);
          return;
        }
        if (!res.ok) {
          setError("server");
          setEntries([]);
          return;
        }
        const data = (await res.json()) as { entries?: Entry[] };
        setError(null);
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      } catch {
        if (!cancelled) {
          setError("server");
          setEntries([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const modal =
    preview && mounted ? (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.leaderboard.viewCard")}
        onClick={() => setPreview(null)}
      >
        <div
          className="flex max-h-[min(92vh,900px)] max-w-[min(92vw,320px)] flex-col items-center gap-4 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <GameCard card={preview} />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="w-full max-w-[280px] rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
          >
            {t("profile.leaderboard.closePreview")}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <aside
      className={`flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 ${className}`.trim()}
      aria-labelledby="pack-page-leaderboard-heading"
    >
      {mounted && modal ? createPortal(modal, document.body) : null}

      <h2
        id="pack-page-leaderboard-heading"
        className="text-base font-semibold text-zinc-100"
      >
        {t("profile.leaderboard.title")}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{t("profile.leaderboard.subtitle")}</p>

      {entries === null ? (
        <p className="mt-4 text-sm text-zinc-500">{t("profile.leaderboard.loading")}</p>
      ) : error === "no_database" ? (
        <p className="mt-4 text-sm text-zinc-500">{t("profile.leaderboard.noDatabase")}</p>
      ) : error === "server" ? (
        <p className="mt-4 text-sm text-amber-200/80">{t("profile.leaderboard.loadError")}</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{t("profile.leaderboard.empty")}</p>
      ) : (
        <div className="mt-3 min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[280px] border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-zinc-900/40">
              <tr className="border-b border-zinc-800 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                <th className="py-1.5 pr-2 tabular-nums">{t("profile.leaderboard.rank")}</th>
                <th className="py-1.5 pr-2">{t("profile.leaderboard.player")}</th>
                <th className="py-1.5 pr-2">{t("profile.leaderboard.card")}</th>
                <th className="py-1.5 pl-1 text-right tabular-nums">{t("profile.leaderboard.total")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.userId} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-1.5 pr-2 tabular-nums text-zinc-400">{e.rank}</td>
                  <td className="max-w-[6rem] py-1.5 pr-2 sm:max-w-[7rem]">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800">
                        {e.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-500">
                            {e.displayName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="truncate font-medium text-zinc-200" title={e.displayName}>
                        {e.displayName}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[5rem] py-1.5 pr-2 sm:max-w-[8rem]">
                    <button
                      type="button"
                      title={t("profile.leaderboard.viewCard")}
                      aria-label={`${t("profile.leaderboard.viewCard")}: ${e.cardName}`}
                      onClick={() => setPreview(e.card)}
                      className="max-w-full truncate text-left text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-sky-300"
                    >
                      {e.cardName}
                    </button>
                  </td>
                  <td className="py-1.5 pl-1 text-right tabular-nums font-medium text-amber-200/90">
                    {e.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
}
