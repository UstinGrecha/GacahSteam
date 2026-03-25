"use client";

import { useI18n } from "@/components/I18nProvider";
import type { BoosterFaceCopy, Messages } from "@/lib/i18n/types";
import type { PackKind } from "@/lib/gacha/packKinds";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { forwardRef } from "react";

export type BoosterPhase = "idle" | "loading" | "tearing" | "opened";

type BoosterPackProps = {
  phase: BoosterPhase;
  packKind?: PackKind;
  cardSeries: CardSeries;
  /** Подпись под бейджем («Серия 1» и т.д.). */
  seriesLine: string;
};

const H = 292;
const HALF = H / 2;
const W = 188;

const SHELL: Record<
  PackKind,
  { border: string; shadow: string; flash: string }
> = {
  standard: {
    border: "border-[4px] border-[#b8860b]",
    shadow:
      "shadow-[0_18px_50px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]",
    flash:
      "bg-gradient-to-b from-white via-amber-100/90 to-transparent",
  },
  budget: {
    border: "border-[3px] border-stone-500",
    shadow:
      "shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]",
    flash:
      "bg-gradient-to-b from-stone-200/95 via-stone-300/70 to-transparent",
  },
  premium: {
    border: "border-[4px] border-[#e9c46a]",
    shadow:
      "shadow-[0_22px_60px_rgba(0,0,0,0.6),0_0_24px_rgba(234,179,8,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]",
    flash:
      "bg-gradient-to-b from-amber-50 via-yellow-200/85 to-transparent",
  },
};

/** Вторая серия: фиолетовый / циановый акцент вместо золотого. */
const SHELL_S2: Record<
  PackKind,
  { border: string; shadow: string; flash: string }
> = {
  standard: {
    border: "border-[4px] border-violet-500/95",
    shadow:
      "shadow-[0_18px_50px_rgba(76,29,149,0.5),0_0_36px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.07)]",
    flash:
      "bg-gradient-to-b from-fuchsia-200/92 via-cyan-100/75 to-transparent",
  },
  budget: {
    border: "border-[3px] border-sky-500/85",
    shadow:
      "shadow-[0_14px_42px_rgba(12,74,110,0.45),0_0_20px_rgba(56,189,248,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]",
    flash:
      "bg-gradient-to-b from-cyan-200/88 via-slate-200/65 to-transparent",
  },
  premium: {
    border: "border-[4px] border-fuchsia-500/90",
    shadow:
      "shadow-[0_22px_58px_rgba(0,0,0,0.68),0_0_32px_rgba(217,70,239,0.38),inset_0_1px_0_rgba(255,255,255,0.1)]",
    flash:
      "bg-gradient-to-b from-cyan-50/95 via-fuchsia-200/78 to-transparent",
  },
};

/** Бустер: тип пака + серия (вторая серия — отдельная палитра). */
export const BoosterPack = forwardRef<HTMLDivElement, BoosterPackProps>(
  function BoosterPack(
    { phase, packKind = "standard", cardSeries, seriesLine },
    ref,
  ) {
    const { messages } = useI18n();
    const b = messages.booster;
    const shake = phase === "loading";
    const tearMotion = phase === "tearing" || phase === "opened";
    const showFlash = phase === "tearing";
    const opened = phase === "opened";
    const skin =
      cardSeries === 2 ? SHELL_S2[packKind] : SHELL[packKind];

    return (
      <div className="mx-auto flex w-[188px] flex-col items-center">
        <div
          className={`relative overflow-visible ${shake ? "sg-booster-shake-wrap" : ""} ${
            phase === "idle" ? "sg-booster-idle-wrap" : ""
          }`}
          style={{ perspective: "1000px" }}
        >
          <div
            ref={ref}
            data-sg-booster-card
            className={`relative overflow-hidden rounded-xl bg-zinc-950 transition-opacity duration-700 ${skin.border} ${skin.shadow} ${
              opened ? "opacity-[0.15]" : "opacity-100"
            }`}
            style={{ height: H, width: W }}
          >
            <div
              className={`absolute left-0 right-0 top-0 z-[2] overflow-hidden ${
                tearMotion ? "sg-booster-tear-top" : ""
              }`}
              style={{ height: HALF }}
            >
              <div
                className="absolute left-0 top-0"
                style={{ height: H, width: W }}
              >
                <BoosterFaceFull
                  kind={packKind}
                  width={W}
                  height={H}
                  booster={b}
                  cardSeries={cardSeries}
                  seriesLine={seriesLine}
                />
              </div>
            </div>

            <div
              className={`absolute bottom-0 left-0 right-0 z-[1] overflow-hidden ${
                tearMotion ? "sg-booster-tear-bot" : ""
              }`}
              style={{ height: HALF }}
            >
              <div
                className="absolute left-0"
                style={{ height: H, width: W, top: -HALF }}
              >
                <BoosterFaceFull
                  kind={packKind}
                  width={W}
                  height={H}
                  booster={b}
                  cardSeries={cardSeries}
                  seriesLine={seriesLine}
                />
              </div>
            </div>

            {showFlash ? (
              <div
                className={`sg-booster-flash pointer-events-none absolute inset-0 z-[5] rounded-[10px] ${skin.flash}`}
                aria-hidden
              />
            ) : null}
          </div>
        </div>

        {opened ? (
          <p
            className={`mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] ${
              cardSeries === 2
                ? "text-fuchsia-400/85"
                : "text-amber-600/75"
            }`}
          >
            {b.opened}
          </p>
        ) : null}
      </div>
    );
  },
);

function BoosterFaceFull({
  kind,
  width: W,
  height: H,
  booster,
  cardSeries,
  seriesLine,
}: {
  kind: PackKind;
  width: number;
  height: number;
  booster: Messages["booster"];
  cardSeries: CardSeries;
  seriesLine: string;
}) {
  switch (kind) {
    case "budget":
      return (
        <FaceBudget
          W={W}
          H={H}
          copy={booster.budget}
          brand={booster.gacha}
          packMark={booster.packMark}
          cardSeries={cardSeries}
          seriesLine={seriesLine}
        />
      );
    case "premium":
      return (
        <FacePremium
          W={W}
          H={H}
          copy={booster.premium}
          brand={booster.gacha}
          packMark={booster.packMark}
          cardSeries={cardSeries}
          seriesLine={seriesLine}
        />
      );
    default:
      return (
        <FaceStandard
          W={W}
          H={H}
          copy={booster.standard}
          brand={booster.gacha}
          packMark={booster.packMark}
          cardSeries={cardSeries}
          seriesLine={seriesLine}
        />
      );
  }
}

function FaceStandard({
  W,
  H,
  copy,
  brand,
  packMark,
  cardSeries,
  seriesLine,
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
  packMark: string;
  cardSeries: CardSeries;
  seriesLine: string;
}) {
  const s2 = cardSeries === 2;
  return (
    <div
      className={`flex h-full w-full flex-col ${s2 ? "bg-[#06040f]" : "bg-zinc-950"}`}
      style={{ width: W, height: H }}
    >
      <div
        className={`relative flex h-[36%] flex-col overflow-hidden px-2.5 pb-1 pt-3 ${
          s2
            ? "bg-gradient-to-b from-violet-950 via-indigo-950 to-zinc-950"
            : "bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[42%] opacity-80 ${
            s2
              ? "bg-gradient-to-r from-fuchsia-600/30 via-cyan-500/25 to-violet-600/28"
              : "bg-gradient-to-r from-violet-500/25 via-cyan-400/20 to-amber-400/25"
          }`}
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <span
              className={
                s2
                  ? "rounded border border-cyan-400/55 bg-black/45 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.28em] text-cyan-100/95"
                  : "rounded border border-[#c9a227]/70 bg-black/40 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.28em] text-amber-200/90"
              }
            >
              {copy.badge}
            </span>
            <span
              className={
                s2
                  ? "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.2em] text-fuchsia-200/80"
                  : "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.18em] text-amber-400/82"
              }
            >
              {seriesLine}
            </span>
          </div>
          <span
            className={
              s2
                ? "text-[8px] font-black uppercase tracking-[0.15em] text-cyan-500/55"
                : "text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500"
            }
          >
            {packMark}
          </span>
        </div>
        <p
          className={`relative mt-2 text-center font-[family-name:var(--font-geist-sans)] text-[11px] font-extrabold uppercase leading-tight tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
            s2
              ? "text-transparent bg-gradient-to-b from-cyan-100 to-fuchsia-200 bg-clip-text"
              : "text-[#fef3c7]"
          }`}
        >
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div
        className={`relative flex h-[14%] shrink-0 items-center justify-center ${
          s2
            ? "bg-gradient-to-r from-violet-700 via-slate-500 to-cyan-800"
            : "bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
        <p
          className={`absolute z-[1] text-[7px] font-bold uppercase tracking-[0.4em] ${
            s2 ? "text-violet-950/88" : "text-zinc-800"
          }`}
        >
          {copy.tear}
        </p>
        <div
          className={`h-0 w-[86%] border-t border-dashed ${
            s2 ? "border-violet-950/55" : "border-zinc-700/90"
          }`}
        />
      </div>

      <div
        className={`relative flex flex-1 flex-col items-center overflow-hidden px-2 pt-2 ${
          s2
            ? "bg-gradient-to-b from-zinc-950 via-violet-950/95 to-black"
            : "bg-gradient-to-b from-zinc-950 via-indigo-950/80 to-black"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-6 -top-4 h-24 w-24 rounded-full blur-2xl ${
            s2 ? "bg-fuchsia-600/18" : "bg-indigo-600/15"
          }`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute -bottom-8 left-1/2 h-20 w-40 -translate-x-1/2 blur-3xl ${
            s2 ? "rounded-full bg-cyan-500/14" : "rounded-full bg-amber-500/10"
          }`}
          aria-hidden
        />

        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className={`absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 shadow-md ${
              s2
                ? "border-violet-600/85 bg-gradient-to-br from-violet-900/55 to-zinc-950/90"
                : "border-[#8b6914]/80 bg-gradient-to-br from-zinc-700/50 to-zinc-900/80"
            }`}
            style={{ transform: "rotate(-14deg) translateX(-18px)" }}
            aria-hidden
          />
          <div
            className={`absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 shadow-lg ${
              s2
                ? "border-cyan-600/80 bg-gradient-to-br from-cyan-950/50 to-zinc-900/85"
                : "border-[#a16207]/90 bg-gradient-to-br from-zinc-600/40 to-zinc-800/70"
            }`}
            style={{ transform: "rotate(6deg) translateX(4px)" }}
            aria-hidden
          />
          <div
            className={`relative h-[4.35rem] w-[2.95rem] rounded-[6px] border-[3px] ${
              s2
                ? "border-fuchsia-400/95 bg-gradient-to-br from-[#faf5ff] via-[#e9d5ff] to-[#22d3ee] shadow-[0_8px_24px_rgba(168,85,247,0.45)]"
                : "border-[#c9a227] bg-gradient-to-br from-[#fffef5] via-[#fdf3cf] to-[#e8c547] shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            }`}
            style={{ transform: "rotate(0deg) translateX(14px)" }}
            aria-hidden
          >
            <div
              className={`absolute inset-[5px] rounded-sm border bg-zinc-900/20 ${
                s2 ? "border-fuchsia-900/30" : "border-amber-900/25"
              }`}
            />
            <span
              className={`absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black ${
                s2 ? "text-violet-950/75" : "text-amber-950/70"
              }`}
            >
              5
            </span>
          </div>
        </div>

        <p
          className={`relative z-[1] mt-1.5 bg-clip-text text-2xl font-black italic tracking-tight text-transparent ${
            s2
              ? "bg-gradient-to-b from-cyan-200 via-fuchsia-300 to-violet-500 drop-shadow-[0_2px_12px_rgba(34,211,238,0.25)]"
              : "bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500 drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]"
          }`}
        >
          {brand}
        </p>

        <div
          className={`relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border bg-black/50 px-2.5 py-0.5 ${
            s2
              ? "border-cyan-400/35 shadow-[0_0_14px_rgba(168,85,247,0.2)]"
              : "border-amber-500/35"
          }`}
        >
          <span
            className={
              s2
                ? "text-[11px] font-black tabular-nums text-cyan-100"
                : "text-[11px] font-black tabular-nums text-amber-100"
            }
          >
            5
          </span>
          <span
            className={
              s2
                ? "text-[8px] font-semibold uppercase tracking-wide text-fuchsia-200/78"
                : "text-[8px] font-semibold uppercase tracking-wide text-amber-200/75"
            }
          >
            {copy.cardsWord}
          </span>
        </div>

        <p
          className={`relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug ${
            s2 ? "text-violet-300/45" : "text-zinc-500"
          }`}
        >
          {copy.footer}
        </p>
      </div>
    </div>
  );
}

function FaceBudget({
  W,
  H,
  copy,
  brand,
  packMark,
  cardSeries,
  seriesLine,
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
  packMark: string;
  cardSeries: CardSeries;
  seriesLine: string;
}) {
  const s2 = cardSeries === 2;
  return (
    <div
      className={`flex h-full w-full flex-col ${s2 ? "bg-[#0c1929]" : "bg-[#292524]"}`}
      style={{ width: W, height: H }}
    >
      <div
        className={`relative flex h-[36%] flex-col overflow-hidden px-2.5 pb-1 pt-3 ${
          s2
            ? "bg-gradient-to-b from-slate-800 via-sky-950/80 to-[#0f172a]"
            : "bg-gradient-to-b from-[#44403c] via-[#292524] to-[#1c1917]"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[45%] opacity-40"
          style={{
            backgroundImage: s2
              ? "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(56,189,248,0.06) 2px, rgba(56,189,248,0.06) 3px)"
              : "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)",
          }}
          aria-hidden
        />
        {s2 ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-r from-cyan-500/12 via-sky-500/10 to-violet-500/12"
            aria-hidden
          />
        ) : null}
        <div className="relative flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <span
              className={
                s2
                  ? "rounded border border-sky-500/55 bg-slate-900/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.2em] text-sky-300/95"
                  : "rounded border border-stone-600 bg-stone-800/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.2em] text-stone-400"
              }
            >
              {copy.badge}
            </span>
            <span
              className={
                s2
                  ? "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.2em] text-cyan-200/75"
                  : "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.18em] text-stone-500/90"
              }
            >
              {seriesLine}
            </span>
          </div>
          <span
            className={
              s2
                ? "text-[8px] font-black uppercase tracking-[0.12em] text-sky-600/55"
                : "text-[8px] font-black uppercase tracking-[0.12em] text-stone-600"
            }
          >
            {packMark}
          </span>
        </div>
        <p
          className={`relative mt-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${
            s2 ? "text-sky-100/92" : "text-stone-300"
          }`}
        >
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div
        className={`relative flex h-[14%] shrink-0 items-center justify-center ${
          s2
            ? "bg-gradient-to-r from-slate-700 via-cyan-800/90 to-slate-800"
            : "bg-gradient-to-r from-[#57534e] via-[#78716c] to-[#57534e]"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/30" />
        <p
          className={`absolute z-[1] text-[6px] font-bold uppercase tracking-[0.35em] ${
            s2 ? "text-slate-950/85" : "text-stone-900/90"
          }`}
        >
          {copy.tear}
        </p>
        <div
          className={`h-0 w-[88%] border-t border-dashed ${
            s2 ? "border-sky-950/50" : "border-stone-800/80"
          }`}
        />
      </div>

      <div
        className={`relative flex flex-1 flex-col items-center overflow-hidden px-2 pt-2 ${
          s2
            ? "bg-gradient-to-b from-[#0f172a] via-slate-950 to-black"
            : "bg-gradient-to-b from-[#1c1917] to-black"
        }`}
      >
        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className={`absolute h-[4.1rem] w-[2.75rem] rounded-[4px] border shadow-sm ${
              s2
                ? "border-slate-600 bg-slate-900/70"
                : "border-stone-700 bg-stone-800/60"
            }`}
            style={{ transform: "rotate(-12deg) translateX(-16px)" }}
            aria-hidden
          />
          <div
            className={`absolute h-[4.1rem] w-[2.75rem] rounded-[4px] border shadow-sm ${
              s2
                ? "border-cyan-800/80 bg-sky-950/55"
                : "border-stone-600 bg-stone-700/50"
            }`}
            style={{ transform: "rotate(8deg) translateX(6px)" }}
            aria-hidden
          />
          <div
            className={`relative h-[4.2rem] w-[2.85rem] rounded-[5px] border-2 shadow-md ${
              s2
                ? "border-sky-400/75 bg-gradient-to-br from-slate-600 via-sky-900/60 to-slate-950"
                : "border-stone-500 bg-gradient-to-br from-stone-600 to-stone-900"
            }`}
            style={{ transform: "rotate(0deg) translateX(12px)" }}
            aria-hidden
          >
            <span
              className={
                s2
                  ? "absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-sky-200/85"
                  : "absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-stone-400"
              }
            >
              5
            </span>
          </div>
        </div>

        <p
          className={`relative z-[1] mt-1.5 text-xl font-black uppercase italic tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
            s2 ? "text-sky-400/88" : "text-stone-500"
          }`}
        >
          {brand}
        </p>

        <div
          className={`relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border bg-black/40 px-2 py-0.5 ${
            s2 ? "border-sky-500/45" : "border-stone-600/60"
          }`}
        >
          <span
            className={
              s2
                ? "text-[10px] font-black tabular-nums text-sky-200"
                : "text-[10px] font-black tabular-nums text-stone-400"
            }
          >
            5
          </span>
          <span
            className={
              s2
                ? "text-[7px] font-semibold uppercase tracking-wide text-cyan-200/70"
                : "text-[7px] font-semibold uppercase tracking-wide text-stone-500"
            }
          >
            {copy.cardsWord}
          </span>
        </div>

        <p
          className={`relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug ${
            s2 ? "text-sky-700/65" : "text-stone-600"
          }`}
        >
          {copy.footer}
        </p>
      </div>
    </div>
  );
}

function FacePremium({
  W,
  H,
  copy,
  brand,
  packMark,
  cardSeries,
  seriesLine,
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
  packMark: string;
  cardSeries: CardSeries;
  seriesLine: string;
}) {
  const s2 = cardSeries === 2;
  return (
    <div
      className={`flex h-full w-full flex-col ${s2 ? "bg-[#050814]" : "bg-[#0c0a09]"}`}
      style={{ width: W, height: H }}
    >
      <div
        className={`relative flex h-[36%] flex-col overflow-hidden px-2.5 pb-1 pt-3 ${
          s2
            ? "bg-gradient-to-b from-[#1e1033] via-[#0c1929] to-black"
            : "bg-gradient-to-b from-[#1e1b4b] via-[#0f172a] to-black"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-[50%] ${
            s2
              ? "bg-gradient-to-r from-fuchsia-600/22 via-cyan-500/18 to-violet-600/22"
              : "bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-600/20"
          }`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute -right-2 top-2 h-10 w-10 rounded-full blur-xl ${
            s2 ? "bg-cyan-400/14" : "bg-amber-400/10"
          }`}
        />
        <div className="relative flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <span
              className={
                s2
                  ? "rounded border border-fuchsia-400/75 bg-gradient-to-b from-violet-950/60 to-black/65 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-fuchsia-100 shadow-[0_0_14px_rgba(34,211,238,0.22)]"
                  : "rounded border border-[#e9c46a]/90 bg-gradient-to-b from-amber-900/50 to-black/60 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-[#fde68a] shadow-[0_0_12px_rgba(234,179,8,0.25)]"
              }
            >
              {copy.badge}
            </span>
            <span
              className={
                s2
                  ? "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.2em] text-cyan-200/78"
                  : "max-w-[4.75rem] text-[6px] font-semibold uppercase leading-tight tracking-[0.18em] text-amber-300/72"
              }
            >
              {seriesLine}
            </span>
          </div>
          <span
            className={
              s2
                ? "text-[8px] font-black uppercase tracking-[0.15em] text-fuchsia-400/55"
                : "text-[8px] font-black uppercase tracking-[0.15em] text-indigo-300/60"
            }
          >
            {packMark}
          </span>
        </div>
        <p
          className={`relative mt-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-transparent bg-clip-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
            s2
              ? "bg-gradient-to-b from-cyan-100 via-fuchsia-200 to-violet-400"
              : "bg-gradient-to-b from-[#fef9c3] to-[#d97706]"
          }`}
        >
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div
        className={`relative flex h-[14%] shrink-0 items-center justify-center ${
          s2
            ? "bg-gradient-to-r from-violet-900 via-fuchsia-600 to-cyan-700"
            : "bg-gradient-to-r from-[#713f12] via-[#ca8a04] to-[#713f12]"
        }`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-px ${
            s2 ? "bg-cyan-200/35" : "bg-amber-200/50"
          }`}
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/40" />
        <p
          className={`absolute z-[1] text-[7px] font-bold uppercase tracking-[0.45em] ${
            s2 ? "text-violet-950/92" : "text-amber-950/90"
          }`}
        >
          {copy.tear}
        </p>
        <div
          className={`h-0 w-[86%] border-t border-dashed ${
            s2 ? "border-violet-950/45" : "border-amber-950/50"
          }`}
        />
      </div>

      <div
        className={`relative flex flex-1 flex-col items-center overflow-hidden px-2 pt-2 ${
          s2
            ? "bg-gradient-to-b from-black via-violet-950/35 to-black"
            : "bg-gradient-to-b from-black via-[#1e1b4b]/40 to-black"
        }`}
      >
        <div
          className={`pointer-events-none absolute left-1/2 top-0 h-16 w-32 -translate-x-1/2 rounded-full blur-2xl ${
            s2 ? "bg-fuchsia-500/14" : "bg-amber-500/12"
          }`}
          aria-hidden
        />

        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className={`absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 shadow-md ${
              s2
                ? "border-violet-700/90 bg-gradient-to-br from-violet-950/90 to-black"
                : "border-[#854d0e]/90 bg-gradient-to-br from-amber-950/80 to-black"
            }`}
            style={{ transform: "rotate(-14deg) translateX(-18px)" }}
            aria-hidden
          />
          <div
            className={`absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 shadow-lg ${
              s2
                ? "border-cyan-600 bg-gradient-to-br from-cyan-950/55 to-zinc-950"
                : "border-[#a16207] bg-gradient-to-br from-amber-900/50 to-zinc-900"
            }`}
            style={{ transform: "rotate(6deg) translateX(4px)" }}
            aria-hidden
          />
          <div
            className={`relative h-[4.35rem] w-[2.95rem] rounded-[6px] border-[3px] ${
              s2
                ? "border-cyan-300/90 bg-gradient-to-br from-[#ecfeff] via-[#e9d5ff] to-[#a855f7] shadow-[0_8px_28px_rgba(168,85,247,0.4)]"
                : "border-[#fcd34d] bg-gradient-to-br from-[#fffbeb] via-[#fde68a] to-[#d97706] shadow-[0_8px_28px_rgba(234,179,8,0.35)]"
            }`}
            style={{ transform: "rotate(0deg) translateX(14px)" }}
            aria-hidden
          >
            <div
              className={`absolute inset-[5px] rounded-sm border bg-black/10 ${
                s2 ? "border-fuchsia-900/35" : "border-amber-900/30"
              }`}
            />
            <span
              className={
                s2
                  ? "absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-violet-950/82"
                  : "absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-amber-950/80"
              }
            >
              5
            </span>
          </div>
        </div>

        <p
          className={`relative z-[1] mt-1.5 bg-clip-text text-2xl font-black italic tracking-tight text-transparent ${
            s2
              ? "bg-gradient-to-b from-cyan-100 via-fuchsia-300 to-violet-500 drop-shadow-[0_2px_10px_rgba(217,70,239,0.35)]"
              : "bg-gradient-to-b from-[#fef3c7] via-amber-300 to-amber-600 drop-shadow-[0_2px_8px_rgba(234,179,8,0.35)]"
          }`}
        >
          {brand}
        </p>

        <div
          className={`relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border bg-black/55 px-2.5 py-0.5 ${
            s2
              ? "border-cyan-400/45 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
              : "border-amber-400/40 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
          }`}
        >
          <span
            className={
              s2
                ? "text-[11px] font-black tabular-nums text-cyan-100"
                : "text-[11px] font-black tabular-nums text-amber-100"
            }
          >
            5
          </span>
          <span
            className={
              s2
                ? "text-[8px] font-semibold uppercase tracking-wide text-fuchsia-200/82"
                : "text-[8px] font-semibold uppercase tracking-wide text-amber-200/85"
            }
          >
            {copy.cardsWord}
          </span>
        </div>

        <p
          className={`relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug ${
            s2 ? "text-cyan-200/35" : "text-indigo-200/40"
          }`}
        >
          {copy.footer}
        </p>
      </div>
    </div>
  );
}
