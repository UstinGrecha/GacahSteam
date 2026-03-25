"use client";

import steamAppIds from "@/data/steam-app-ids.json";
import {
  DUST_REROLL_SLOT,
  FREE_PACKS_PER_DAY,
  PITY_PACKS,
} from "@/lib/economy/constants";
import {
  fetchDebugShowcaseCards,
  fetchOneNewCard,
  openPackFromPool,
} from "@/lib/gacha/openPack";
import { packCoinCost, type PackKind } from "@/lib/gacha/packKinds";
import { isRarePlus } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";
import { loadState } from "@/lib/storage/persist";
import { localDay } from "@/lib/storage/streak";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { BoosterPack } from "./BoosterPack";
import { PackDeck } from "./PackDeck";
import { useGameStorage } from "./StorageProvider";

const POOL = steamAppIds as number[];

const TEAR_MS = 960;

const IS_DEV = process.env.NODE_ENV === "development";

export function PackOpener() {
  const { state, commit, refresh } = useGameStorage();
  const { t } = useI18n();
  const [cards, setCards] = useState<SteamCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "loading" | "tearing" | "opened"
  >("idle");
  const [packKind, setPackKind] = useState<PackKind>("standard");
  const tearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const [deckKey, setDeckKey] = useState(0);
  const lastPullIdRef = useRef<string | null>(null);
  const lastOpenPoolRef = useRef<number[]>(POOL);
  const lastPackKindRef = useRef<PackKind>("standard");

  useEffect(() => {
    return () => {
      if (tearTimer.current) clearTimeout(tearTimer.current);
    };
  }, []);

  /** После полуночи или при возврате на вкладку подтягиваем localStorage → не блокируем пак устаревшим state. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const today = localDay();
  const dailyAligned = state.daily.date === today;
  const freeUsed = dailyAligned ? state.daily.freePacksUsed : 0;
  const freeLeft = Math.max(0, FREE_PACKS_PER_DAY - freeUsed);
  const coinPrice = packCoinCost(packKind);
  const canOpenPack =
    coinPrice === null ? freeLeft > 0 : state.coins >= coinPrice;

  const dismissDeck = useCallback(() => {
    setCards(null);
    setPhase("idle");
    lastPullIdRef.current = null;
  }, []);

  const open = useCallback(async () => {
    setError(null);
    setCards(null);
    setPhase("idle");
    if (tearTimer.current) {
      clearTimeout(tearTimer.current);
      tearTimer.current = null;
    }

    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    refresh();
    const live = loadState();
    const freeLeftLive = Math.max(
      0,
      FREE_PACKS_PER_DAY - live.daily.freePacksUsed,
    );
    const openCost = packCoinCost(packKind);
    if (openCost === null) {
      if (freeLeftLive <= 0) {
        setError(
          t("pack.errStandardExhausted", { max: FREE_PACKS_PER_DAY }),
        );
        return;
      }
    } else if (live.coins < openCost) {
      setError(t("pack.errNeedCoins", { cost: openCost }));
      return;
    }
    if (live.daily.date !== localDay()) {
      setError(t("pack.errRefreshDay"));
      return;
    }

    setLoading(true);
    setPhase("loading");

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const rng = Math.random;

      const effectivePool = POOL;
      lastOpenPoolRef.current = effectivePool;
      lastPackKindRef.current = packKind;

      const forcePity = live.pity.packsSinceRarePlus >= PITY_PACKS;
      const result = await openPackFromPool(
        effectivePool,
        rng,
        origin,
        {
          packKind,
          forcePityRarePlus: forcePity,
        },
      );

      const pullId = crypto.randomUUID();
      lastPullIdRef.current = pullId;

      const hadRarePlus = result.cards.some((c) => isRarePlus(c.rarity));

      commit((draft) => {
        draft.pulls.push({
          id: pullId,
          openedAt: new Date().toISOString(),
          cards: result.cards,
        });
        for (const c of result.cards) {
          const k = String(c.appid);
          draft.spareCopies[k] = (draft.spareCopies[k] ?? 0) + 1;
        }
        if (packKind === "standard") {
          draft.daily.freePacksUsed += 1;
        } else {
          const c = packCoinCost(packKind);
          if (c != null) draft.coins -= c;
        }
        if (hadRarePlus) {
          draft.pity.packsSinceRarePlus = 0;
        } else {
          draft.pity.packsSinceRarePlus += 1;
        }
        if (result.pityActivated) {
          draft.pityActivations += 1;
        }
      });

      setPhase("tearing");
      setDeckKey((k) => k + 1);
      setCards(result.cards);

      tearTimer.current = setTimeout(() => {
        setPhase("opened");
        tearTimer.current = null;
      }, TEAR_MS);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : t("pack.errOpen"));
    } finally {
      setLoading(false);
    }
  }, [commit, packKind, refresh, t]);

  const openDebugShowcase = useCallback(async () => {
    if (!IS_DEV) return;
    setError(null);
    setCards(null);
    setPhase("idle");
    if (tearTimer.current) {
      clearTimeout(tearTimer.current);
      tearTimer.current = null;
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    setLoading(true);
    setPhase("loading");
    try {
      const origin = window.location.origin;
      const list = await fetchDebugShowcaseCards(origin, POOL, Math.random);
      const pullId = crypto.randomUUID();
      lastPullIdRef.current = pullId;
      lastOpenPoolRef.current = POOL;
      lastPackKindRef.current = "standard";
      commit((draft) => {
        draft.pulls.push({
          id: pullId,
          openedAt: new Date().toISOString(),
          cards: list,
        });
        for (const c of list) {
          const k = String(c.appid);
          draft.spareCopies[k] = (draft.spareCopies[k] ?? 0) + 1;
        }
      });
      setPhase("tearing");
      setDeckKey((k) => k + 1);
      setCards(list);
      tearTimer.current = setTimeout(() => {
        setPhase("opened");
        tearTimer.current = null;
      }, TEAR_MS);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : t("pack.errOpen"));
    } finally {
      setLoading(false);
    }
  }, [commit, t]);

  const rerollRandomSlot = useCallback(async () => {
    const pullId = lastPullIdRef.current;
    const current = cards;
    if (!pullId || !current?.length || state.dust < DUST_REROLL_SLOT) return;
    setRerolling(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const rng = Math.random;
      const exclude = new Set(current.map((c) => c.appid));
      const idx = Math.floor(rng() * current.length);
      const oldCard = current[idx]!;
      const newCard = await fetchOneNewCard(
        lastOpenPoolRef.current,
        rng,
        origin,
        exclude,
        lastPackKindRef.current,
      );
      if (!newCard) {
        setError(t("pack.errReplace"));
        return;
      }
      const next = [...current];
      next[idx] = newCard;
      setCards(next);
      commit((draft) => {
        const p = draft.pulls.find((x) => x.id === pullId);
        if (p) p.cards = next;
        draft.dust -= DUST_REROLL_SLOT;
        const ko = String(oldCard.appid);
        const kn = String(newCard.appid);
        draft.spareCopies[ko] = Math.max(0, (draft.spareCopies[ko] ?? 0) - 1);
        draft.spareCopies[kn] = (draft.spareCopies[kn] ?? 0) + 1;
        const hadRarePlus = next.some((c) => isRarePlus(c.rarity));
        if (hadRarePlus) draft.pity.packsSinceRarePlus = 0;
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("pack.errReroll"),
      );
    } finally {
      setRerolling(false);
    }
  }, [cards, commit, state.dust, t]);

  const busy = loading || phase === "tearing";
  const buttonLabel = loading
    ? t("pack.loading")
    : phase === "tearing"
      ? t("pack.tearing")
      : coinPrice == null
        ? freeLeft > 0
          ? t("pack.openStandardFree")
          : t("pack.noFreeLeft")
        : t("pack.openForCoins", { n: coinPrice });

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center text-sm text-zinc-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {t("pack.kindLabel")}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {(
              [
                ["standard", "pack.standard"],
                ["budget", "pack.budget"],
                ["premium", "pack.premium"],
              ] as const
            ).map(([k, labelKey]) => (
              <button
                key={k}
                type="button"
                disabled={busy}
                onClick={() => setPackKind(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  packKind === k
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                } disabled:opacity-50`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          <p className="text-balance text-[11px] text-zinc-500">
            {t("pack.hintSummary", {
              freeLeft,
              freeMax: FREE_PACKS_PER_DAY,
              pity: PITY_PACKS,
            })}
          </p>
        </div>

        <div className="relative inline-flex flex-col items-center">
          <BoosterPack ref={packRef} phase={phase} packKind={packKind} />
          {cards && cards.length > 0 ? (
            <PackDeck
              key={deckKey}
              cards={cards}
              packRef={packRef}
              onDismiss={dismissDeck}
            />
          ) : null}
        </div>

        {IS_DEV ? (
          <div className="flex w-full max-w-md flex-col items-center gap-1 rounded-lg border border-dashed border-amber-700/40 bg-amber-950/20 px-3 py-2">
            <button
              type="button"
              onClick={() => void openDebugShowcase()}
              disabled={busy}
              className="rounded-lg border border-amber-600/50 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-amber-200/95 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t("pack.debugAllRarities")}
            </button>
            <p className="text-center text-[10px] leading-snug text-zinc-500">
              {t("pack.debugAllRaritiesSub")}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={open}
          disabled={busy || !canOpenPack}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-10 py-3.5 text-sm font-bold text-amber-950 shadow-[0_8px_28px_rgba(234,179,8,0.4)] transition-all hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500 hover:shadow-[0_12px_36px_rgba(234,179,8,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span
            className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
            aria-hidden
          />
          <span className="relative">{buttonLabel}</span>
        </button>

        {cards && cards.length > 0 && lastPullIdRef.current ? (
          <button
            type="button"
            disabled={
              rerolling || state.dust < DUST_REROLL_SLOT || busy
            }
            onClick={() => void rerollRandomSlot()}
            className="rounded-full border border-violet-600/50 bg-violet-950/40 px-5 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {rerolling
              ? t("pack.rerolling")
              : t("pack.rerollSlot", { n: DUST_REROLL_SLOT })}
          </button>
        ) : null}

        {error ? (
          <p className="max-w-md text-center text-sm text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
