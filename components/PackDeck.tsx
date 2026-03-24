"use client";

import type { SteamCard } from "@/lib/gacha/types";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { useI18n } from "./I18nProvider";
import { GameCard } from "./GameCard";

const SWIPE_NEXT = -92;
const SWIPE_PREV = 92;
const FLY_MS = 780;
const STAGGER_MS = 95;
/** Вертикальный центр пака BoosterPack (высота 292px). */
const PACK_CENTER_Y = 146;

type PackDeckProps = {
  cards: SteamCard[];
  packRef: RefObject<HTMLElement | null>;
  /** Вызывается, когда с последней карты делают шаг «дальше» (свайп, кнопка, стрелка). */
  onDismiss: () => void;
};

export function PackDeck({ cards, packRef, onDismiss }: PackDeckProps) {
  const { t } = useI18n();
  const deckRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [flyDone, setFlyDone] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragActive = useRef(false);
  const startX = useRef(0);

  const stack = cards.slice(deckIndex);
  const n = cards.length;
  const currentNum = deckIndex + 1;

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const pack = packRef.current;
      const deck = deckRef.current;
      if (!pack || !deck) {
        setOrigin({ x: 0, y: 0 });
        return;
      }
      const pr = pack.getBoundingClientRect();
      const dr = deck.getBoundingClientRect();
      const pcx = pr.left + pr.width / 2;
      const pcy = pr.top + pr.height / 2;
      const dcx = dr.left + dr.width / 2;
      const dcy = dr.top + dr.height / 2;
      setOrigin({ x: pcx - dcx, y: pcy - dcy });
    });
    return () => cancelAnimationFrame(id);
  }, [cards, packRef]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setFlyDone(true),
      STAGGER_MS * Math.max(0, n - 1) + FLY_MS + 40,
    );
    return () => clearTimeout(t);
  }, [cards, n]);

  const goNext = useCallback(() => {
    setDeckIndex((i) => Math.min(n - 1, i + 1));
    setDragX(0);
  }, [n]);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const goPrev = useCallback(() => {
    setDeckIndex((i) => Math.max(0, i - 1));
    setDragX(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (deckIndex >= n - 1) dismiss();
        else goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deckIndex, dismiss, goNext, goPrev, n]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!flyDone) return;
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    dragActive.current = true;
    setIsDragging(true);
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current || !flyDone) return;
    const d = e.clientX - startX.current;
    setDragX(Math.max(-160, Math.min(160, d)));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragActive.current) return;
    dragActive.current = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const endX = Math.max(-160, Math.min(160, e.clientX - startX.current));
    if (endX <= SWIPE_NEXT) {
      if (deckIndex < n - 1) goNext();
      else dismiss();
    } else if (endX >= SWIPE_PREV && deckIndex > 0) goPrev();
    else setDragX(0);
  };

  const onPointerCancel = () => {
    dragActive.current = false;
    setIsDragging(false);
    setDragX(0);
  };

  const stackArea = (
    <div
      ref={deckRef}
      className="relative min-h-[min(90vh,720px)] w-full max-w-[280px] overflow-visible"
    >
      {stack.map((card, layer) => {
        const landX = layer * 8;
        const landY = layer * 10;
        const landRot = layer * 2;
        const landScale = 1 - layer * 0.036;

        const isTop = layer === 0;
        const tx = isTop ? landX + dragX : landX;
        const rot = isTop ? landRot + dragX * 0.06 : landRot;

        const flying = !flyDone;
        const innerStyle: CSSProperties = flying
          ? {
              ["--fly-x" as string]: `${origin.x}px`,
              ["--fly-y" as string]: `${origin.y}px`,
              ["--land-x" as string]: `${landX}px`,
              ["--land-y" as string]: `${landY}px`,
              ["--land-scale" as string]: String(landScale),
              ["--land-rot" as string]: `${landRot}deg`,
              animationDelay: `${layer * STAGGER_MS}ms`,
            }
          : {
              transform: `translate(${tx}px, ${landY}px) rotate(${rot}deg) scale(${landScale})`,
              transition: isDragging
                ? "none"
                : "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
            };

        return (
          <div
            key={`${card.appid}-${deckIndex}-${layer}`}
            className="absolute left-1/2 top-1/2 w-[min(92vw,280px)] -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: 60 - layer }}
          >
            <div
              className={flying ? "sg-deck-card-flying" : ""}
              style={innerStyle}
            >
              <div
                className={
                  isTop && flyDone
                    ? "cursor-grab select-none touch-none active:cursor-grabbing [-webkit-touch-callout:none] [-webkit-user-select:none]"
                    : "pointer-events-none"
                }
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                onPointerCancel={isTop ? onPointerCancel : undefined}
              >
                <GameCard card={card} variant="deck" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const controls = (
    <div className="mt-4 flex w-full max-w-[320px] flex-col items-center gap-3 px-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={deckIndex <= 0 || !flyDone}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={t("deck.ariaPrev")}
        >
          {t("deck.prev")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (deckIndex >= n - 1) dismiss();
            else goNext();
          }}
          disabled={!flyDone}
          className="rounded-full border border-sky-600/60 bg-sky-950/50 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-900/60 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={
            deckIndex >= n - 1 ? t("deck.ariaClose") : t("deck.ariaNext")
          }
        >
          {deckIndex >= n - 1 ? t("deck.done") : t("deck.next")}
        </button>
      </div>
      <div
        className="flex items-center gap-1.5"
        role="tablist"
        aria-label={t("deck.dotList")}
      >
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setDeckIndex(i);
              setDragX(0);
            }}
            disabled={!flyDone}
            className={`h-2 rounded-full transition-all ${
              i === deckIndex
                ? "w-6 bg-sky-500"
                : "w-2 bg-zinc-700 hover:bg-zinc-600"
            } disabled:opacity-40`}
            aria-label={t("deck.ariaDot", { n: i + 1 })}
            aria-current={i === deckIndex}
          />
        ))}
      </div>
      <p className="text-center text-[11px] tabular-nums text-zinc-500">
        {currentNum} / {n}
      </p>
    </div>
  );

  return (
    <>
      <div
        className="pointer-events-none absolute left-1/2 z-30 w-[min(92vw,280px)] max-w-[280px] -translate-x-1/2 -translate-y-1/2"
        style={{ top: PACK_CENTER_Y }}
        aria-hidden={false}
      >
        <div className="pointer-events-auto">{stackArea}</div>
      </div>

      <section
        className="sg-results-enter mt-2 w-full"
        aria-label={t("deck.controlsRegion")}
        role="region"
      >
        <h2 className="mb-1 text-center text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
          {t("deck.section")}
        </h2>
        <p className="mb-3 text-center text-[11px] leading-snug text-zinc-600">
          {t("deck.hint")}
        </p>
        {controls}
      </section>
    </>
  );
}
