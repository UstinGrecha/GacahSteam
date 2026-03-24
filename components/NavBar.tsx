"use client";

import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import Link from "next/link";

export function NavBar() {
  const { state } = useGameStorage();
  const { t } = useI18n();
  const links = [
    { href: "/", label: t("nav.pack") },
    { href: "/collection", label: t("nav.collection") },
    { href: "/stats", label: t("nav.stats") },
    { href: "/achievements", label: t("nav.achievements") },
    { href: "/settings", label: t("nav.settings") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-50">
          Steam<span className="text-sky-400">Gacha</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="hidden rounded-lg border border-amber-600/40 bg-amber-950/30 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-200 sm:block"
            title={t("nav.coinsTitle")}
          >
            {state.coins} {t("nav.coins")}
          </div>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
