import type { Rarity } from "@/lib/gacha/types";

export const rarityLabelRu: Record<Rarity, string> = {
  common: "Обычная",
  uncommon: "Необычная",
  rare: "Редкая",
  epic: "Супер редкая",
  holo: "Голографическая редкость (HR / ZR)",
  legend: "Ультра редкая",
  champion: "Трофей рейда",
};

/** Коды редкости в стиле TCG (от низшей к высшей). */
export const RARITY_TCG_CODE: Record<Rarity, string> = {
  common: "C",
  uncommon: "U",
  rare: "R",
  epic: "SR",
  holo: "HR",
  legend: "UR",
  champion: "CR",
};

export function rarityTcgCode(r: Rarity): string {
  return RARITY_TCG_CODE[r];
}

/** Метка-код подписи на карточке / в списках. */
export function rarityTcgCodePillClasses(r: Rarity): string {
  switch (r) {
    case "common":
      return "border border-zinc-500/60 bg-zinc-200/90 text-zinc-900";
    case "uncommon":
      return "border border-emerald-700/50 bg-emerald-200/90 text-emerald-950";
    case "rare":
      return "border border-sky-800/50 bg-sky-200/90 text-sky-950";
    case "epic":
      return "border border-violet-800/50 bg-violet-200/90 text-violet-950";
    case "holo":
      return "border border-cyan-700/55 bg-gradient-to-r from-cyan-200 via-fuchsia-100 to-cyan-200 text-cyan-950";
    case "legend":
      return "border border-amber-500/70 bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-950";
    case "champion":
      return "border border-rose-600/70 bg-gradient-to-r from-rose-200 via-red-100 to-amber-200 text-rose-950";
    default:
      return "border border-zinc-500 bg-zinc-200 text-zinc-900";
  }
}

/** Outer frame + ambient glow */
export function rarityFrameClasses(r: Rarity): string {
  switch (r) {
    case "common":
      return "border border-zinc-600/90 bg-zinc-950/90 shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)]";
    case "uncommon":
      return "border border-emerald-500/50 bg-zinc-950/90 shadow-[0_4px_28px_rgba(16,185,129,0.2),0_0_40px_rgba(16,185,129,0.08)]";
    case "rare":
      return "border border-sky-400/55 bg-zinc-950/90 shadow-[0_4px_32px_rgba(14,165,233,0.28),0_0_48px_rgba(56,189,248,0.12)]";
    case "epic":
      return "border border-violet-400/55 bg-zinc-950/90 shadow-[0_4px_36px_rgba(168,85,247,0.32),0_0_56px_rgba(139,92,246,0.15)]";
    case "holo":
      return "border border-cyan-400/50 bg-zinc-950/90 shadow-[0_4px_38px_rgba(34,211,238,0.35),0_0_56px_rgba(217,70,239,0.18)]";
    case "legend":
      return "border-0 bg-zinc-950/90 shadow-[0_4px_40px_rgba(251,191,36,0.35),0_0_64px_rgba(245,158,11,0.18)]";
    case "champion":
      return "border border-rose-500/55 bg-zinc-950/90 shadow-[0_4px_44px_rgba(244,63,94,0.4),0_0_72px_rgba(225,29,72,0.22)]";
    default:
      return "border border-zinc-600";
  }
}

export function rarityBadgeClasses(r: Rarity): string {
  switch (r) {
    case "common":
      return "bg-zinc-800/95 text-zinc-100 ring-1 ring-zinc-600/60 backdrop-blur-sm";
    case "uncommon":
      return "bg-emerald-600/95 text-emerald-50 ring-1 ring-emerald-400/50 backdrop-blur-sm";
    case "rare":
      return "bg-sky-600/95 text-white ring-1 ring-sky-300/50 backdrop-blur-sm";
    case "epic":
      return "bg-violet-600/95 text-violet-50 ring-1 ring-violet-300/50 backdrop-blur-sm";
    case "holo":
      return "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-extrabold ring-1 ring-cyan-200/60 shadow-md shadow-cyan-500/20 backdrop-blur-sm";
    case "legend":
      return "bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-extrabold ring-1 ring-amber-200/70 shadow-lg shadow-amber-500/25";
    case "champion":
      return "bg-gradient-to-r from-rose-600 to-red-500 text-white font-extrabold ring-1 ring-rose-200/70 shadow-lg shadow-rose-600/30";
    default:
      return "bg-zinc-700";
  }
}

/** Круглый значок «S» (Steam) в шапке карты — цвет и обводка по редкости. */
export function raritySteamTypeOrbClasses(r: Rarity): string {
  switch (r) {
    case "common":
      return "border-zinc-600 bg-gradient-to-br from-zinc-200 to-zinc-600 text-zinc-950 shadow-sm";
    case "uncommon":
      return "border-emerald-800 bg-gradient-to-br from-emerald-300 to-emerald-800 text-emerald-950 shadow-sm";
    case "rare":
      return "border-sky-900 bg-gradient-to-br from-sky-300 to-indigo-700 text-white shadow-md shadow-sky-900/25";
    case "epic":
      return "border-violet-900 bg-gradient-to-br from-fuchsia-300 to-violet-900 text-white shadow-md shadow-violet-900/30";
    case "holo":
      return "border-cyan-400 bg-gradient-to-br from-cyan-200 via-white to-fuchsia-400 text-cyan-950 shadow-md shadow-fuchsia-500/35 ring-2 ring-cyan-300/60";
    case "legend":
      return "border-amber-400 bg-gradient-to-br from-amber-100 via-yellow-300 to-amber-600 text-amber-950 shadow-md shadow-amber-600/35 ring-2 ring-amber-300/70";
    case "champion":
      return "border-rose-400 bg-gradient-to-br from-rose-200 via-red-300 to-rose-700 text-white shadow-md shadow-rose-600/40 ring-2 ring-rose-300/65";
    default:
      return "border-zinc-800 bg-gradient-to-br from-sky-300 to-indigo-600 text-white shadow-sm";
  }
}

/** Accent for stat numbers on the light card face */
export function rarityStatAccent(r: Rarity): string {
  switch (r) {
    case "common":
      return "text-zinc-900";
    case "uncommon":
      return "text-emerald-300";
    case "rare":
      return "text-sky-300";
    case "epic":
      return "text-violet-300";
    case "holo":
      return "text-cyan-600";
    case "legend":
      return "text-amber-300";
    case "champion":
      return "text-rose-300";
    default:
      return "text-zinc-100";
  }
}
