"use client";

import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { state } = useGameStorage();
  const { t } = useI18n();
  const { status } = useSession();
  const guestLinks = [
    { href: "/", label: t("nav.pack") },
    { href: "/raid", label: t("nav.raid") },
    { href: "/market", label: t("nav.market") },
    { href: "/collection", label: t("nav.collection") },
    { href: "/stats", label: t("nav.stats") },
    { href: "/achievements", label: t("nav.achievements") },
    { href: "/settings", label: t("nav.settings") },
  ];
  const userLinks = [
    { href: "/", label: t("nav.pack") },
    { href: "/raid", label: t("nav.raid") },
    { href: "/market", label: t("nav.market") },
    { href: "/settings", label: t("nav.settings") },
  ];
  const links =
    status === "authenticated" ? userLinks : guestLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex min-w-0 max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-zinc-50 sm:text-lg"
          title={t("nav.brand")}
        >
          {t("nav.brand")}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div
            className="shrink-0 self-end rounded-lg border border-amber-600/40 bg-amber-950/30 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-200 sm:self-auto sm:px-2.5 sm:py-1 sm:text-xs"
            title={t("nav.coinsTitle")}
          >
            {state.coins} {t("nav.coins")}
          </div>
          <nav className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden pb-0.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:justify-end sm:gap-2 sm:overflow-visible sm:pb-0">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white sm:px-3 sm:py-1.5"
              >
                {l.label}
              </Link>
            ))}
            {status === "authenticated" ? (
              <>
                <Link
                  href="/profile"
                  className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-sky-400 hover:bg-zinc-800 hover:text-sky-300 sm:px-3 sm:py-1.5"
                >
                  {t("nav.profile")}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white sm:px-3 sm:py-1.5"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : status === "loading" ? (
              <span className="shrink-0 px-2.5 py-2 text-sm text-zinc-600 sm:px-3 sm:py-1.5">
                …
              </span>
            ) : (
              <Link
                href="/login"
                className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-sky-400 hover:bg-zinc-800 hover:text-sky-300 sm:px-3 sm:py-1.5"
              >
                {t("nav.authorization")}
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
