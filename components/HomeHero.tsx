"use client";

import { useI18n } from "@/components/I18nProvider";

export function HomeHero() {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
        {t("home.title")}
      </h1>
      <p className="mt-2 text-sm text-zinc-400 sm:text-base">
        {t("home.subtitle")}
      </p>
    </div>
  );
}
