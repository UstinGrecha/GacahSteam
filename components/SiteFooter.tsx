"use client";

import { useI18n } from "@/components/I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer
      className="mt-auto border-t border-zinc-800/80 bg-zinc-950/80 py-6 text-zinc-500"
      role="contentinfo"
    >
      <div className="mx-auto max-w-5xl space-y-3 px-4 text-[11px] leading-relaxed">
        <p>{t("legal.line1")}</p>
        <p className="text-zinc-600">{t("legal.line2")}</p>
        <p className="text-zinc-600">{t("legal.line3")}</p>
      </div>
    </footer>
  );
}
