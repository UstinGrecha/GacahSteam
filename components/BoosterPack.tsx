"use client";

import { useI18n } from "@/components/I18nProvider";
import type { BoosterFaceCopy, Messages } from "@/lib/i18n/types";
import type { PackKind } from "@/lib/gacha/packKinds";
import { forwardRef } from "react";

export type BoosterPhase = "idle" | "loading" | "tearing" | "opened";

type BoosterPackProps = {
  phase: BoosterPhase;
  packKind?: PackKind;
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

/** Бустер: внешний вид зависит от типа пака (standard / budget / premium). */
export const BoosterPack = forwardRef<HTMLDivElement, BoosterPackProps>(
  function BoosterPack({ phase, packKind = "standard" }, ref) {
    const { messages } = useI18n();
    const b = messages.booster;
    const shake = phase === "loading";
    const tearMotion = phase === "tearing" || phase === "opened";
    const showFlash = phase === "tearing";
    const opened = phase === "opened";
    const skin = SHELL[packKind];

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
          <p className="mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/75">
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
}: {
  kind: PackKind;
  width: number;
  height: number;
  booster: Messages["booster"];
}) {
  switch (kind) {
    case "budget":
      return (
        <FaceBudget W={W} H={H} copy={booster.budget} brand={booster.gacha} />
      );
    case "premium":
      return (
        <FacePremium W={W} H={H} copy={booster.premium} brand={booster.gacha} />
      );
    default:
      return (
        <FaceStandard W={W} H={H} copy={booster.standard} brand={booster.gacha} />
      );
  }
}

function FaceStandard({
  W,
  H,
  copy,
  brand,
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col bg-zinc-950"
      style={{ width: W, height: H }}
    >
      <div className="relative flex h-[36%] flex-col overflow-hidden bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 px-2.5 pb-1 pt-3">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-r from-violet-500/25 via-cyan-400/20 to-amber-400/25 opacity-80"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-1">
          <span className="rounded border border-[#c9a227]/70 bg-black/40 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.28em] text-amber-200/90">
            {copy.badge}
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Steam
          </span>
        </div>
        <p className="relative mt-2 text-center font-[family-name:var(--font-geist-sans)] text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#fef3c7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div className="relative flex h-[14%] shrink-0 items-center justify-center bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600">
        <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
        <p className="absolute z-[1] text-[7px] font-bold uppercase tracking-[0.4em] text-zinc-800">
          {copy.tear}
        </p>
        <div className="h-0 w-[86%] border-t border-dashed border-zinc-700/90" />
      </div>

      <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-zinc-950 via-indigo-950/80 to-black px-2 pt-2">
        <div
          className="pointer-events-none absolute -right-6 -top-4 h-24 w-24 rounded-full bg-indigo-600/15 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className="absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 border-[#8b6914]/80 bg-gradient-to-br from-zinc-700/50 to-zinc-900/80 shadow-md"
            style={{ transform: "rotate(-14deg) translateX(-18px)" }}
            aria-hidden
          />
          <div
            className="absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 border-[#a16207]/90 bg-gradient-to-br from-zinc-600/40 to-zinc-800/70 shadow-lg"
            style={{ transform: "rotate(6deg) translateX(4px)" }}
            aria-hidden
          />
          <div
            className="relative h-[4.35rem] w-[2.95rem] rounded-[6px] border-[3px] border-[#c9a227] bg-gradient-to-br from-[#fffef5] via-[#fdf3cf] to-[#e8c547] shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            style={{ transform: "rotate(0deg) translateX(14px)" }}
            aria-hidden
          >
            <div className="absolute inset-[5px] rounded-sm border border-amber-900/25 bg-zinc-900/20" />
            <span className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-amber-950/70">
              5
            </span>
          </div>
        </div>

        <p className="relative z-[1] mt-1.5 bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-2xl font-black italic tracking-tight text-transparent drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)]">
          {brand}
        </p>

        <div className="relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border border-amber-500/35 bg-black/50 px-2.5 py-0.5">
          <span className="text-[11px] font-black tabular-nums text-amber-100">
            5
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-amber-200/75">
            {copy.cardsWord}
          </span>
        </div>

        <p className="relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug text-zinc-500">
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
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col bg-[#292524]"
      style={{ width: W, height: H }}
    >
      <div className="relative flex h-[36%] flex-col overflow-hidden bg-gradient-to-b from-[#44403c] via-[#292524] to-[#1c1917] px-2.5 pb-1 pt-3">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[45%] opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)",
          }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-1">
          <span className="rounded border border-stone-600 bg-stone-800/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.2em] text-stone-400">
            {copy.badge}
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.12em] text-stone-600">
            Steam
          </span>
        </div>
        <p className="relative mt-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-stone-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div className="relative flex h-[14%] shrink-0 items-center justify-center bg-gradient-to-r from-[#57534e] via-[#78716c] to-[#57534e]">
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/30" />
        <p className="absolute z-[1] text-[6px] font-bold uppercase tracking-[0.35em] text-stone-900/90">
          {copy.tear}
        </p>
        <div className="h-0 w-[88%] border-t border-dashed border-stone-800/80" />
      </div>

      <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-[#1c1917] to-black px-2 pt-2">
        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className="absolute h-[4.1rem] w-[2.75rem] rounded-[4px] border border-stone-700 bg-stone-800/60 shadow-sm"
            style={{ transform: "rotate(-12deg) translateX(-16px)" }}
            aria-hidden
          />
          <div
            className="absolute h-[4.1rem] w-[2.75rem] rounded-[4px] border border-stone-600 bg-stone-700/50 shadow-sm"
            style={{ transform: "rotate(8deg) translateX(6px)" }}
            aria-hidden
          />
          <div
            className="relative h-[4.2rem] w-[2.85rem] rounded-[5px] border-2 border-stone-500 bg-gradient-to-br from-stone-600 to-stone-900 shadow-md"
            style={{ transform: "rotate(0deg) translateX(12px)" }}
            aria-hidden
          >
            <span className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-stone-400">
              5
            </span>
          </div>
        </div>

        <p className="relative z-[1] mt-1.5 text-xl font-black uppercase italic tracking-tight text-stone-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {brand}
        </p>

        <div className="relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border border-stone-600/60 bg-black/40 px-2 py-0.5">
          <span className="text-[10px] font-black tabular-nums text-stone-400">
            5
          </span>
          <span className="text-[7px] font-semibold uppercase tracking-wide text-stone-500">
            {copy.cardsWord}
          </span>
        </div>

        <p className="relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug text-stone-600">
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
}: {
  W: number;
  H: number;
  copy: BoosterFaceCopy;
  brand: string;
}) {
  return (
    <div
      className="flex h-full w-full flex-col bg-[#0c0a09]"
      style={{ width: W, height: H }}
    >
      <div className="relative flex h-[36%] flex-col overflow-hidden bg-gradient-to-b from-[#1e1b4b] via-[#0f172a] to-black px-2.5 pb-1 pt-3">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[50%] bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-600/20"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-2 top-2 h-10 w-10 rounded-full bg-amber-400/10 blur-xl" />
        <div className="relative flex items-start justify-between gap-1">
          <span className="rounded border border-[#e9c46a]/90 bg-gradient-to-b from-amber-900/50 to-black/60 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-[#fde68a] shadow-[0_0_12px_rgba(234,179,8,0.25)]">
            {copy.badge}
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-indigo-300/60">
            Steam
          </span>
        </div>
        <p className="relative mt-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-transparent bg-gradient-to-b from-[#fef9c3] to-[#d97706] bg-clip-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
          {copy.title1}
          <br />
          {copy.title2}
        </p>
      </div>

      <div className="relative flex h-[14%] shrink-0 items-center justify-center bg-gradient-to-r from-[#713f12] via-[#ca8a04] to-[#713f12]">
        <div className="absolute inset-x-0 top-0 h-px bg-amber-200/50" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/40" />
        <p className="absolute z-[1] text-[7px] font-bold uppercase tracking-[0.45em] text-amber-950/90">
          {copy.tear}
        </p>
        <div className="h-0 w-[86%] border-t border-dashed border-amber-950/50" />
      </div>

      <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-black via-[#1e1b4b]/40 to-black px-2 pt-2">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-16 w-32 -translate-x-1/2 rounded-full bg-amber-500/12 blur-2xl"
          aria-hidden
        />

        <div className="relative z-[1] mt-0.5 flex h-[5.2rem] w-full items-center justify-center">
          <div
            className="absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 border-[#854d0e]/90 bg-gradient-to-br from-amber-950/80 to-black shadow-md"
            style={{ transform: "rotate(-14deg) translateX(-18px)" }}
            aria-hidden
          />
          <div
            className="absolute h-[4.25rem] w-[2.85rem] rounded-[5px] border-2 border-[#a16207] bg-gradient-to-br from-amber-900/50 to-zinc-900 shadow-lg"
            style={{ transform: "rotate(6deg) translateX(4px)" }}
            aria-hidden
          />
          <div
            className="relative h-[4.35rem] w-[2.95rem] rounded-[6px] border-[3px] border-[#fcd34d] bg-gradient-to-br from-[#fffbeb] via-[#fde68a] to-[#d97706] shadow-[0_8px_28px_rgba(234,179,8,0.35)]"
            style={{ transform: "rotate(0deg) translateX(14px)" }}
            aria-hidden
          >
            <div className="absolute inset-[5px] rounded-sm border border-amber-900/30 bg-black/10" />
            <span className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black text-amber-950/80">
              5
            </span>
          </div>
        </div>

        <p className="relative z-[1] mt-1.5 bg-gradient-to-b from-[#fef3c7] via-amber-300 to-amber-600 bg-clip-text text-2xl font-black italic tracking-tight text-transparent drop-shadow-[0_2px_8px_rgba(234,179,8,0.35)]">
          {brand}
        </p>

        <div className="relative z-[1] mt-1.5 flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/55 px-2.5 py-0.5 shadow-[0_0_12px_rgba(234,179,8,0.15)]">
          <span className="text-[11px] font-black tabular-nums text-amber-100">
            5
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-amber-200/85">
            {copy.cardsWord}
          </span>
        </div>

        <p className="relative z-[1] mt-auto mb-2.5 max-w-[9rem] text-center text-[7px] font-medium leading-snug text-indigo-200/40">
          {copy.footer}
        </p>
      </div>
    </div>
  );
}
