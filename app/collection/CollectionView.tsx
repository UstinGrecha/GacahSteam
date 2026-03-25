"use client";

import { GameCard } from "@/components/GameCard";
import { rarityTcgCode } from "@/components/rarityStyles";
import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import { applySellCardAtSlot } from "@/lib/economy/applySellCard";
import { cardSellCoins } from "@/lib/economy/cardSellPrice";
import { DUST_PER_TRIPLE_SALVAGE } from "@/lib/economy/constants";
import type { Rarity } from "@/lib/gacha/types";
import { useCallback, useMemo, useState } from "react";

const ALL: Rarity | "all" = "all";

const rarityOrder: Rarity[] = [
  "legend",
  "holo",
  "epic",
  "rare",
  "uncommon",
  "common",
];

type CollectionViewProps = { embedded?: boolean };

export function CollectionView({ embedded = false }: CollectionViewProps) {
  const { state, commit, refresh, serverAuthoritative } = useGameStorage();
  const { t, messages, bcp47 } = useI18n();
  const rl = messages.rarity;
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">(ALL);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellingKey, setSellingKey] = useState<string | null>(null);

  const flat = useMemo(
    () =>
      [...state.pulls]
        .sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
        )
        .flatMap((pull) =>
          pull.cards.map((c, slotIndex) => ({
            ...c,
            pullId: pull.id,
            slotIndex,
            openedAt: pull.openedAt,
          })),
        ),
    [state.pulls],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = flat.filter((c) => {
      if (rarity !== "all" && c.rarity !== rarity) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name, bcp47));
  }, [flat, query, rarity, bcp47]);

  const salvageCandidates = useMemo(() => {
    return Object.entries(state.spareCopies)
      .filter(([, n]) => n >= 3)
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id));
  }, [state.spareCopies]);

  const nameByAppid = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of flat) {
      if (!m.has(c.appid)) m.set(c.appid, c.name);
    }
    return m;
  }, [flat]);

  const salvage = useCallback(
    async (appid: number) => {
      if (serverAuthoritative) {
        const res = await fetch("/api/game/salvage", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appid }),
        });
        if (res.ok) await refresh();
        return;
      }
      commit((draft) => {
        const k = String(appid);
        if ((draft.spareCopies[k] ?? 0) < 3) return;
        draft.spareCopies[k] -= 3;
        draft.dust += DUST_PER_TRIPLE_SALVAGE;
        draft.salvageCount += 1;
      });
    },
    [commit, refresh, serverAuthoritative],
  );

  const sellCard = useCallback(
    async (pullId: string, slotIndex: number) => {
      const key = `${pullId}:${slotIndex}`;
      setSellingKey(key);
      setSellError(null);
      try {
        if (serverAuthoritative) {
          const res = await fetch("/api/game/sell-card", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pullId, slotIndex }),
          });
          if (res.ok) {
            await refresh();
          } else {
            setSellError(t("collection.sellError"));
          }
          return;
        }
        let failed = false;
        commit((draft) => {
          const r = applySellCardAtSlot(draft, pullId, slotIndex);
          if (!r.ok) failed = true;
        });
        if (failed) setSellError(t("collection.sellError"));
      } finally {
        setSellingKey(null);
      }
    },
    [commit, refresh, serverAuthoritative, t],
  );

  const uniqueCount = useMemo(
    () => new Set(flat.map((c) => c.appid)).size,
    [flat],
  );

  const Root = embedded ? "section" : "main";
  const Title = embedded ? "h2" : "h1";

  return (
    <Root
      id={embedded ? "profile-collection" : undefined}
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
          {t("collection.title")}
        </Title>
        <p className="mt-1 text-sm text-zinc-400">
          {t("collection.summary", {
            cards: flat.length,
            unique: uniqueCount,
            packs: state.pulls.length,
          })}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder={t("collection.searchPh")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none sm:max-w-xs"
        />
        <select
          value={rarity}
          onChange={(e) =>
            setRarity(e.target.value as Rarity | "all")
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
        >
          <option value="all">{t("collection.allRarities")}</option>
          {rarityOrder.map((r) => (
            <option key={r} value={r}>
              {rarityTcgCode(r)} · {rl[r]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-zinc-500">{t("collection.sellHint")}</p>

      {sellError ? (
        <p className="text-sm text-amber-200/90">{sellError}</p>
      ) : null}

      {salvageCandidates.length > 0 ? (
        <section className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <h2 className="text-sm font-semibold text-violet-200">
            {t("collection.salvageTitle")}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {t("collection.salvageHint", { dust: DUST_PER_TRIPLE_SALVAGE })}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {salvageCandidates.map((appid) => (
              <li
                key={appid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2"
              >
                <span className="text-sm text-zinc-200">
                  {nameByAppid.get(appid) ?? `#${appid}`}
                </span>
                <span className="text-xs text-zinc-500">
                  {t("collection.copies")}{" "}
                  {state.spareCopies[String(appid)] ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => salvage(appid)}
                  disabled={(state.spareCopies[String(appid)] ?? 0) < 3}
                  className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  {t("collection.salvageBtn")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">
          {t("collection.empty")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => {
            const price = cardSellCoins(c);
            const rowKey = `${c.pullId}:${c.slotIndex}`;
            const busy = sellingKey === rowKey;
            return (
              <li key={rowKey} className="flex flex-col">
                <GameCard card={c} />
                <p className="mt-1 text-center text-[10px] text-zinc-600">
                  {new Date(c.openedAt).toLocaleString(bcp47)}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sellCard(c.pullId, c.slotIndex)}
                  className="mt-2 rounded-lg border border-amber-700/50 bg-amber-950/35 px-2 py-1.5 text-center text-xs font-semibold text-amber-200/95 transition hover:bg-amber-900/40 disabled:opacity-45"
                >
                  {busy ? "…" : t("collection.sellBtn", { n: price })}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {state.pulls.length > 0 ? (
        <section className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {t("collection.packHistory")}
          </h2>
          <ol className="space-y-2 text-sm text-zinc-400">
            {state.pulls
              .slice()
              .reverse()
              .map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-zinc-900/50 px-3 py-2"
                >
                  <span className="text-zinc-300">
                    {new Date(p.openedAt).toLocaleString(bcp47)}
                  </span>
                  <span>
                    {p.cards.length} {t("collection.cardsWord")} ·{" "}
                    {[...new Set(p.cards.map((c) => c.appid))].length}{" "}
                    {t("collection.uniqueAbbr")}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      ) : null}
    </Root>
  );
}
