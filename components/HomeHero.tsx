"use client";

import { useI18n } from "@/components/I18nProvider";

export function HomeHero() {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight text-balance text-zinc-50 sm:text-3xl md:text-4xl">
        {t("home.title")}
      </h1>
    </div>
  );
}
