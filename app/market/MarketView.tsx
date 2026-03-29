"use client";

import { GameCard } from "@/components/GameCard";
import { rarityTcgCode } from "@/components/rarityStyles";
import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import {
  MARKET_MAX_PRICE_COINS,
  MARKET_MIN_PRICE_COINS,
} from "@/lib/economy/marketConstants";
import type { MarketListingDto } from "@/lib/server/market";
import type { Rarity } from "@/lib/gacha/types";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FlatCard = {
  pullId: string;
  slotIndex: number;
  key: string;
  name: string;
  headerImage: string;
  rarity: string;
  atk: number;
};

export function MarketView() {
  const { t, messages } = useI18n();
  const mc = messages.market;
  const { state, refresh, serverAuthoritative } = useGameStorage();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const [items, setItems] = useState<MarketListingDto[]>([]);
  const [myItems, setMyItems] = useState<MarketListingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sellOpen, setSellOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState(String(MARKET_MIN_PRICE_COINS));
  const [sellKey, setSellKey] = useState<string | null>(null);

  const canTrade = status === "authenticated" && Boolean(userId);

  const loadAll = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/market/listings", { credentials: "same-origin" });
      const j = (await r.json().catch(() => ({}))) as {
        items?: MarketListingDto[];
        error?: string;
      };
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : mc.loadError);
        setItems([]);
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch {
      setErr(mc.loadError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mc.loadError]);

  const loadMine = useCallback(async () => {
    if (!canTrade) {
      setMyItems([]);
      return;
    }
    try {
      const r = await fetch("/api/market/my", { credentials: "same-origin" });
      const j = (await r.json().catch(() => ({}))) as {
        items?: MarketListingDto[];
      };
      if (r.ok && Array.isArray(j.items)) setMyItems(j.items);
      else setMyItems([]);
    } catch {
      setMyItems([]);
    }
  }, [canTrade]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const flatCards = useMemo((): FlatCard[] => {
    return [...state.pulls]
      .sort(
        (a, b) =>
          new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
      )
      .flatMap((pull) =>
        pull.cards.map((c, slotIndex) => ({
          pullId: pull.id,
          slotIndex,
          key: `${pull.id}:${slotIndex}`,
          name: c.name,
          headerImage: c.headerImage,
          rarity: c.rarity,
          atk: c.atk,
        })),
      );
  }, [state.pulls]);

  const selectedSell = useMemo(() => {
    if (!sellKey) return null;
    const [pullId, slot] = sellKey.split(":");
    const slotIndex = Number(slot);
    if (!pullId || !Number.isInteger(slotIndex)) return null;
    return { pullId, slotIndex };
  }, [sellKey]);

  const onBuy = async (listingId: string) => {
    if (!canTrade) {
      setToast(mc.needLoginBuy);
      return;
    }
    setBusyId(listingId);
    setToast(null);
    try {
      const r = await fetch("/api/market/buy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.status === 402 || j.error === "need_coins") {
        setToast(mc.needCoins);
        return;
      }
      if (j.error === "gone" || j.error === "not_found") {
        setToast(mc.gone);
        await loadAll();
        return;
      }
      if (!r.ok) {
        setToast(mc.loadError);
        return;
      }
      setToast(mc.bought);
      await refresh();
      await loadAll();
      await loadMine();
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (listingId: string) => {
    setBusyId(listingId);
    setToast(null);
    try {
      const r = await fetch("/api/market/cancel", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!r.ok) {
        setToast(mc.loadError);
        return;
      }
      setToast(mc.cancelled);
      await refresh();
      await loadAll();
      await loadMine();
    } finally {
      setBusyId(null);
    }
  };

  const onList = async () => {
    if (!canTrade || !selectedSell) return;
    const price = Math.floor(Number(sellPrice));
    if (!Number.isFinite(price)) return;
    setBusyId("list");
    setToast(null);
    try {
      const r = await fetch("/api/market/list", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pullId: selectedSell.pullId,
          slotIndex: selectedSell.slotIndex,
          priceCoins: price,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (j.error === "too_many_listings") {
        setToast(mc.tooManyListings);
        return;
      }
      if (!r.ok) {
        setToast(mc.loadError);
        return;
      }
      setToast(mc.listed);
      setSellOpen(false);
      setSellKey(null);
      await refresh();
      await loadAll();
      await loadMine();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-3 py-6 pb-10 sm:px-4">
      <header className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-950 p-5">
        <h1 className="text-2xl font-black tracking-tight text-zinc-50">
          {mc.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {mc.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
          >
            {mc.refresh}
          </button>
          {canTrade ? (
            <button
              type="button"
              onClick={() => setSellOpen((o) => !o)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              {mc.sell}
            </button>
          ) : null}
        </div>
        {!canTrade ? (
          <p className="mt-3 text-sm text-amber-200/90">
            {mc.loginToTrade}{" "}
            <Link href="/login" className="underline hover:text-amber-100">
              {messages.nav.authorization}
            </Link>
          </p>
        ) : null}
        {toast ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
            {toast}
          </p>
        ) : null}
        {err ? (
          <p className="mt-3 text-sm text-red-300">{err}</p>
        ) : null}
      </header>

      {sellOpen && canTrade ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-zinc-100">{mc.listTitle}</h2>
            <button
              type="button"
              onClick={() => setSellOpen(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {mc.close}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{mc.selectCardHint}</p>
          {!serverAuthoritative ? (
            <p className="mt-2 text-sm text-amber-200/90">
              {mc.sellNeedsServer}
            </p>
          ) : null}
          <div className="mt-3 flex max-w-xs flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400">
              {t("market.priceHint", {
                min: MARKET_MIN_PRICE_COINS,
                max: MARKET_MAX_PRICE_COINS,
              })}
            </label>
            <input
              type="number"
              min={MARKET_MIN_PRICE_COINS}
              max={MARKET_MAX_PRICE_COINS}
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              disabled={
                !selectedSell ||
                busyId === "list" ||
                !serverAuthoritative
              }
              onClick={() => void onList()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {mc.listButton}
            </button>
          </div>
          {flatCards.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              {messages.collection.empty}
            </p>
          ) : (
            <ul className="mt-4 flex max-h-[min(50vh,420px)] flex-wrap gap-2 overflow-y-auto">
              {flatCards.map((c) => {
                const on = sellKey === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => setSellKey(c.key)}
                      className={[
                        "flex w-[108px] flex-col rounded-lg border-2 p-1.5 text-left text-[10px] transition",
                        on
                          ? "border-emerald-500 bg-emerald-950/40"
                          : "border-zinc-700 bg-zinc-950 hover:border-zinc-600",
                      ].join(" ")}
                    >
                      <div className="overflow-hidden rounded border border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.headerImage}
                          alt=""
                          className="aspect-[92/43] w-full object-cover"
                        />
                      </div>
                      <span className="mt-1 line-clamp-2 font-semibold text-zinc-200">
                        {c.name}
                      </span>
                      <span className="text-zinc-500">
                        {rarityTcgCode(c.rarity as Rarity)} · {c.atk}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {canTrade && myItems.length > 0 ? (
        <section className="rounded-2xl border border-amber-900/35 bg-amber-950/15 p-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-200/90">
            {mc.myOffers}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myItems.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <div className="origin-top-left scale-[0.72]">
                  <GameCard card={row.card} />
                </div>
                <p className="mt-1 text-sm font-bold text-amber-100">
                  {row.priceCoins} {messages.nav.coins}
                </p>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void onCancel(row.id)}
                  className="mt-2 w-full rounded-lg border border-zinc-600 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  {mc.cancel}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-400">
          {mc.browse}
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">{mc.empty}</p>
        ) : (
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row) => {
              const own = Boolean(userId && row.sellerId === userId);
              const disabled =
                own || !canTrade || busyId === row.id;
              return (
                <li
                  key={row.id}
                  className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                >
                  <div className="origin-top-left scale-[0.72]">
                    <GameCard card={row.card} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {mc.seller}:{" "}
                    <span className="font-medium text-zinc-300">
                      {row.sellerLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-lg font-black tabular-nums text-emerald-200">
                    {row.priceCoins}{" "}
                    <span className="text-sm font-semibold text-zinc-500">
                      {messages.nav.coins}
                    </span>
                  </p>
                  {own ? (
                    <p className="mt-2 text-xs font-semibold text-amber-300/90">
                      {mc.ownBadge}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void onBuy(row.id)}
                      className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === row.id ? "…" : mc.buy}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
