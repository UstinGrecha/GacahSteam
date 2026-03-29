"use client";

import { GameCard } from "@/components/GameCard";
import { rarityTcgCode } from "@/components/rarityStyles";
import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import { applySellCardAtSlot } from "@/lib/economy/applySellCard";
import { cardSellCoins } from "@/lib/economy/cardSellPrice";
import { DUST_PER_TRIPLE_SALVAGE } from "@/lib/economy/constants";
import type { Rarity } from "@/lib/gacha/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const ALL: Rarity | "all" = "all";

const rarityOrder: Rarity[] = [
  "champion",
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
  const carouselRef = useRef<HTMLUListElement>(null);
  const [carouselAtStart, setCarouselAtStart] = useState(true);
  const [carouselAtEnd, setCarouselAtEnd] = useState(false);

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

  const carouselScrollStride = useCallback(() => {
    const root = carouselRef.current;
    if (!root) return 300;
    const first = root.querySelector("li");
    if (!first) return Math.min(320, root.clientWidth * 0.88);
    const style = getComputedStyle(root);
    const gap = parseFloat(style.columnGap || style.gap || "24") || 24;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const updateCarouselScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const slack = 4;
    setCarouselAtStart(scrollLeft <= slack);
    setCarouselAtEnd(scrollLeft + clientWidth >= scrollWidth - slack);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    queueMicrotask(updateCarouselScrollState);
  }, [query, rarity, updateCarouselScrollState]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    updateCarouselScrollState();
    el.addEventListener("scroll", updateCarouselScrollState, { passive: true });
    const ro = new ResizeObserver(updateCarouselScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateCarouselScrollState);
      ro.disconnect();
    };
  }, [filtered.length, updateCarouselScrollState]);

  const carouselScrollPrev = useCallback(() => {
    carouselRef.current?.scrollBy({
      left: -carouselScrollStride(),
      behavior: "smooth",
    });
  }, [carouselScrollStride]);

  const carouselScrollNext = useCallback(() => {
    carouselRef.current?.scrollBy({
      left: carouselScrollStride(),
      behavior: "smooth",
    });
  }, [carouselScrollStride]);

  const onCarouselKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLUListElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        carouselScrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        carouselScrollNext();
      }
    },
    [carouselScrollPrev, carouselScrollNext],
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
        <div className="relative">
          <p className="mb-2 text-center text-xs text-zinc-500 sm:text-left">
            {t("collection.carouselSwipeHint")}
          </p>
          <button
            type="button"
            aria-label={t("collection.carouselPrev")}
            disabled={carouselAtStart}
            onClick={carouselScrollPrev}
            className="absolute left-0 top-[40%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900/95 text-lg leading-none text-zinc-100 shadow-lg backdrop-blur-sm transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 disabled:pointer-events-none disabled:opacity-25 sm:left-0 sm:h-11 sm:w-11"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={t("collection.carouselNext")}
            disabled={carouselAtEnd}
            onClick={carouselScrollNext}
            className="absolute right-0 top-[40%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900/95 text-lg leading-none text-zinc-100 shadow-lg backdrop-blur-sm transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 disabled:pointer-events-none disabled:opacity-25 sm:right-0 sm:h-11 sm:w-11"
          >
            ›
          </button>
          <ul
            ref={carouselRef}
            tabIndex={0}
            onKeyDown={onCarouselKeyDown}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-visible scroll-smooth py-2 pl-11 pr-11 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:pl-12 sm:pr-12 [&::-webkit-scrollbar]:hidden"
          >
            {filtered.map((c) => {
              const price = cardSellCoins(c);
              const rowKey = `${c.pullId}:${c.slotIndex}`;
              const busy = sellingKey === rowKey;
              return (
                <li
                  key={rowKey}
                  className="flex w-[min(100%,19rem)] shrink-0 snap-center flex-col sm:w-72"
                >
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
        </div>
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
