"use client";

import {
  DUST_REROLL_SLOT,
  FREE_PACKS_PER_DAY,
  PITY_PACKS,
} from "@/lib/economy/constants";
import {
  consumeStandardFreePack,
  getFreeStandardOpensAfterSync,
} from "@/lib/economy/sync";
import { getFreeStandardOpensAfterUtcSync } from "@/lib/economy/syncUtc";
import { fetchOneNewCard, openPackFromPool } from "@/lib/gacha/openPackBrowser";
import { type CardSeries, isSeriesPacksAvailable } from "@/lib/gacha/steamPools";
import { packCoinCost, type PackKind } from "@/lib/gacha/packKinds";
import { isRarePlus, rarityTier } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";
import {
  ensureAudioUnlocked,
  playPackLoadingSound,
  playPackRevealSound,
  playPackTearSound,
} from "@/lib/audio/packSounds";
import { loadState } from "@/lib/storage/persist";
import { localDay } from "@/lib/storage/streak";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { BoosterPack } from "./BoosterPack";
import { PackDeck } from "./PackDeck";
import { useGameStorage } from "./StorageProvider";

const TEAR_MS = 960;

export function PackOpener() {
  const { state, commit, refresh, serverAuthoritative } = useGameStorage();
  const { t } = useI18n();
  const [cards, setCards] = useState<SteamCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "loading" | "tearing" | "opened"
  >("idle");
  const [packKind, setPackKind] = useState<PackKind>("standard");
  const [series, setSeries] = useState<CardSeries>(1);
  /** На один цикл после смены серии: колода «снимается» со стопки и кладётся сверху. */
  const [deckSwapAnim, setDeckSwapAnim] = useState(false);
  const prevSeriesRef = useRef<CardSeries | null>(null);
  const tearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const [deckKey, setDeckKey] = useState(0);
  const lastPullIdRef = useRef<string | null>(null);
  const lastPackKindRef = useRef<PackKind>("standard");
  /** Серия/тип на момент открытия (для реролла на сервере — не текущий выбор в UI). */
  const lastOpenContextRef = useRef<{ series: CardSeries; packKind: PackKind }>({
    series: 1,
    packKind: "standard",
  });

  useEffect(() => {
    return () => {
      if (tearTimer.current) clearTimeout(tearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (prevSeriesRef.current === null) {
      prevSeriesRef.current = series;
      return;
    }
    if (prevSeriesRef.current === series) return;
    prevSeriesRef.current = series;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setDeckSwapAnim(true);
    const id = window.setTimeout(() => setDeckSwapAnim(false), 800);
    return () => clearTimeout(id);
  }, [series]);

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

  const freeTotal = serverAuthoritative
    ? getFreeStandardOpensAfterUtcSync(state)
    : getFreeStandardOpensAfterSync(state);
  const coinPrice = packCoinCost(packKind);
  const canOpenPack =
    coinPrice === null
      ? freeTotal > 0
      : state.coins >= coinPrice;

  const dismissDeck = useCallback(() => {
    setCards(null);
    setPhase("idle");
    lastPullIdRef.current = null;
  }, []);

  const open = useCallback(async () => {
    try {
      ensureAudioUnlocked();
    } catch {
      /* звук не должен блокировать открытие */
    }
    setError(null);
    setCards(null);
    setPhase("idle");
    if (tearTimer.current) {
      clearTimeout(tearTimer.current);
      tearTimer.current = null;
    }

    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    await refresh();

    if (!isSeriesPacksAvailable(series)) {
      setError(t("pack.series2Soon"));
      return;
    }

    const openCost = packCoinCost(packKind);

    if (!serverAuthoritative) {
      const live = loadState();
      if (openCost === null) {
        if (getFreeStandardOpensAfterSync(live) <= 0) {
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
    }

    setLoading(true);
    setPhase("loading");
    void playPackLoadingSound().catch(() => {});

    lastPackKindRef.current = packKind;
    lastOpenContextRef.current = { series, packKind };

    try {
      if (serverAuthoritative) {
        const res = await fetch("/api/game/open-pack", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packKind, series }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          cards?: SteamCard[];
          pullId?: string;
        };
        if (!res.ok) {
          setPhase("idle");
          if (j.error === "series_unavailable")
            setError(t("pack.series2Soon"));
          else if (j.error === "no_free")
            setError(t("pack.errStandardExhausted", { max: FREE_PACKS_PER_DAY }));
          else if (j.error === "need_coins")
            setError(t("pack.errNeedCoins", { cost: openCost ?? 0 }));
          else
            setError(
              typeof j.message === "string" && j.message
                ? j.message
                : t("pack.errOpen"),
            );
          return;
        }
        const resultCards = j.cards;
        const pullId = j.pullId;
        if (!resultCards?.length || !pullId) {
          setPhase("idle");
          setError(t("pack.errOpen"));
          return;
        }
        await refresh();
        lastPullIdRef.current = pullId;
        const hadRarePlus = resultCards.some((c) => isRarePlus(c.rarity));
        setPhase("tearing");
        setDeckKey((k) => k + 1);
        setCards(resultCards);
        void playPackTearSound(hadRarePlus).catch(() => {});
        tearTimer.current = setTimeout(() => {
          setPhase("opened");
          void playPackRevealSound(hadRarePlus).catch(() => {});
          tearTimer.current = null;
        }, TEAR_MS);
      } else {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const rng = Math.random;
        const live = loadState();
        const forcePity = live.pity.packsSinceRarePlus >= PITY_PACKS;
        const result = await openPackFromPool(series, rng, origin, {
          packKind,
          forcePityRarePlus: forcePity,
        });

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
            consumeStandardFreePack(draft);
          } else {
            const c = packCoinCost(packKind);
            if (c != null) draft.coins -= c;
          }
          draft.daily.packsOpenedToday += 1;
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
        void playPackTearSound(hadRarePlus).catch(() => {});

        tearTimer.current = setTimeout(() => {
          setPhase("opened");
          void playPackRevealSound(hadRarePlus).catch(() => {});
          tearTimer.current = null;
        }, TEAR_MS);
      }
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : t("pack.errOpen"));
    } finally {
      setLoading(false);
    }
  }, [commit, packKind, refresh, series, serverAuthoritative, t]);

  const rerollRandomSlot = useCallback(async () => {
    const pullId = lastPullIdRef.current;
    const current = cards;
    if (!pullId || !current?.length || state.dust < DUST_REROLL_SLOT) return;
    setRerolling(true);
    setError(null);
    try {
      if (serverAuthoritative) {
        const res = await fetch("/api/game/reroll", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pullId,
            series: lastOpenContextRef.current.series,
            packKind: lastOpenContextRef.current.packKind,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          cards?: SteamCard[];
        };
        if (!res.ok) {
          if (j.error === "need_dust") return;
          if (j.error === "not_latest_pull") {
            setError(t("pack.errReroll"));
            return;
          }
          setError(
            typeof j.message === "string" && j.message
              ? j.message
              : t("pack.errReroll"),
          );
          return;
        }
        if (!j.cards?.length) {
          setError(t("pack.errReplace"));
          return;
        }
        await refresh();
        setCards(j.cards);
        return;
      }

      const origin = window.location.origin;
      const rng = Math.random;
      const exclude = new Set(current.map((c) => c.appid));
      const idx = Math.floor(rng() * current.length);
      const oldCard = current[idx]!;
      const newCard = await fetchOneNewCard(
        lastOpenContextRef.current.series,
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
  }, [cards, commit, refresh, serverAuthoritative, state.dust, t]);

  const showRareDeckAmbience =
    cards != null &&
    cards.length > 0 &&
    cards.some((c) => isRarePlus(c.rarity));
  const rareDeckAmbienceIntense =
    showRareDeckAmbience &&
    cards!.some((c) => rarityTier(c.rarity) >= 4);

  const busy = loading || phase === "tearing";
  const seriesBlocked = !isSeriesPacksAvailable(series);
  const buttonLabel = loading
    ? t("pack.loading")
    : phase === "tearing"
      ? t("pack.tearing")
      : seriesBlocked
        ? t("pack.series2Soon")
        : coinPrice == null
          ? freeTotal > 0
            ? t("pack.openStandardFree")
            : t("pack.noFreeLeft")
          : t("pack.openForCoins", { n: coinPrice });

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-8 overflow-x-hidden sm:gap-10">
      <div className="flex w-full min-w-0 max-w-md flex-col items-center gap-4 px-0">
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
              freeTotal,
              freeMax: FREE_PACKS_PER_DAY,
              pity: PITY_PACKS,
            })}
          </p>
        </div>

        <div className="relative isolate flex w-full flex-col items-center">
          {showRareDeckAmbience ? (
            <div
              className={`sg-deck-rare-ambience pointer-events-none absolute left-1/2 top-[200px] z-0 aspect-square w-[min(130vw,42rem)] max-w-none -translate-x-1/2 -translate-y-1/2 ${
                rareDeckAmbienceIntense ? "sg-deck-rare-ambience--intense" : ""
              }`}
              aria-hidden
            >
              <div className="sg-deck-rare-ambience-inner" />
            </div>
          ) : null}
          <div className="relative z-10 flex w-full max-w-[min(100%,28rem)] flex-col items-center gap-3">
            <div className="flex w-full flex-col items-center px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t("pack.seriesSection")}
              </span>
            </div>
            {/*
              Стопка: активная серия спереди. При переключении — CSS: задняя колода
              «поднимается» и ставится перед другой, бывшая передняя «уходит» назад.
            */}
            <div className="relative mx-auto min-h-[308px] w-full max-w-[17.5rem] touch-manipulation sm:min-h-[318px]">
              {([1, 2] as const).map((s) => {
                const isFront = series === s;
                const swap = deckSwapAnim;
                return (
                  <div
                    key={s}
                    className={`absolute left-1/2 top-0 flex flex-col items-center gap-1.5 rounded-xl p-0.5 ${
                      swap ? "sg-pack-deck-swap-armed" : ""
                    } ${
                      swap && isFront
                        ? "sg-pack-deck-pull-front"
                        : swap && !isFront
                          ? "sg-pack-deck-send-back"
                          : isFront
                            ? "z-30 translate-x-[calc(-50%-1rem)] -translate-y-0.5 opacity-100 transition-[transform,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.33,1,0.64,1)]"
                            : "z-10 translate-x-[calc(-50%+1rem)] translate-y-7 opacity-90 transition-[transform,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.33,1,0.64,1)] sm:translate-y-8"
                    } ${
                      isFront
                        ? "ring-2 ring-sky-500 ring-offset-1 ring-offset-zinc-950 sm:ring-offset-2"
                        : "ring-2 ring-transparent"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={busy ? -1 : 0}
                      aria-pressed={series === s}
                      aria-label={t("pack.seriesLabel", { n: s })}
                      onClick={() => {
                        if (!busy) setSeries(s);
                      }}
                      onKeyDown={(e) => {
                        if (busy) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSeries(s);
                        }
                      }}
                      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      <BoosterPack
                        ref={series === s ? packRef : undefined}
                        phase={series === s ? phase : "idle"}
                        packKind={packKind}
                        cardSeries={s}
                        seriesLine={t("pack.seriesLabel", { n: s })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {phase === "opened" && cards && cards.length > 0 ? (
              <PackDeck
                key={deckKey}
                cards={cards}
                packRef={packRef}
                onDismiss={dismissDeck}
              />
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={open}
          disabled={busy || !canOpenPack || seriesBlocked}
          className="group relative w-full max-w-xs overflow-hidden rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-amber-950 shadow-[0_8px_28px_rgba(234,179,8,0.4)] transition-all hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500 hover:shadow-[0_12px_36px_rgba(234,179,8,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:max-w-none sm:px-10"
        >
          <span
            className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
            aria-hidden
          />
          <span className="relative">{buttonLabel}</span>
        </button>

        {phase === "opened" &&
        cards &&
        cards.length > 0 &&
        lastPullIdRef.current ? (
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
