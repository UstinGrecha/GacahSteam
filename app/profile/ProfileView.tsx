"use client";

import { AchievementsView } from "@/app/achievements/AchievementsView";
import { CollectionView } from "@/app/collection/CollectionView";
import { StatsView } from "@/app/stats/StatsView";
import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import { useSession } from "next-auth/react";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const s = (name?.trim() || email?.trim() || "?").slice(0, 2);
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export function ProfileView() {
  const { data: session } = useSession();
  const { state } = useGameStorage();
  const { t } = useI18n();
  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "";
  const letter = initials(user?.name, user?.email);

  return (
    <main className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">
          {user?.image ? (
            // OAuth avatars come from arbitrary hosts (e.g. Google).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-300">
              {letter}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-zinc-50">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("profile.subtitle")}</p>
          {displayName ? (
            <p className="mt-2 truncate text-base font-medium text-zinc-200">
              {displayName}
            </p>
          ) : null}
          {user?.email ? (
            <p className="mt-0.5 truncate text-sm text-zinc-500">{user.email}</p>
          ) : null}
          <p className="mt-3 text-sm tabular-nums text-amber-200/90">
            {state.coins} {t("nav.coins")}
          </p>
        </div>
      </header>

      <nav
        className="-mx-1 flex flex-wrap gap-1 rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-1 sm:sticky sm:top-[4.25rem] sm:z-30"
        aria-label={t("profile.sectionNav")}
      >
        <a
          href="#profile-collection"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          {t("nav.collection")}
        </a>
        <a
          href="#profile-achievements"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          {t("nav.achievements")}
        </a>
        <a
          href="#profile-stats"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          {t("nav.stats")}
        </a>
      </nav>

      <CollectionView embedded />
      <AchievementsView embedded />
      <StatsView embedded />
    </main>
  );
}
