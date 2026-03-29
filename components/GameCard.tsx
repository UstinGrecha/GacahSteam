import { getCardTraitDef } from "@/lib/gacha/cardTraits";
import type { Rarity, SteamCard } from "@/lib/gacha/types";
import {
  combatResistValue,
  combatRetreatCost,
  combatWeaknessMultiplier,
  computeCardHp,
} from "@/lib/gacha/stats";
import Link from "next/link";
import { Fragment } from "react";
import { useI18n } from "./I18nProvider";
import {
  rarityStatAccent,
  raritySteamTypeOrbClasses,
  rarityTcgCode,
} from "./rarityStyles";

function CardTraitsBlock({ card }: { card: SteamCard }) {
  const { t } = useI18n();
  const traits = card.traits?.length ? card.traits : [];
  if (traits.length === 0) return null;
  return (
    <div className="mx-2 mb-2 rounded border border-violet-400/50 bg-violet-50/90 px-2 py-1.5 text-[8px] leading-snug text-zinc-800 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]">
      <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-violet-900">
        {t("gameCard.traits")}
      </div>
      <ul className="space-y-1">
        {traits.map((tr) => {
          const def = getCardTraitDef(tr.id);
          const line = def
            ? def.effectTemplate.replace(/\{p\}/g, String(tr.potency))
            : null;
          return (
            <li key={tr.id} className="border-b border-violet-200/60 pb-1 last:border-0 last:pb-0">
              <span className="font-extrabold text-zinc-900">
                {def?.name ?? tr.id}{" "}
                <span className="tabular-nums text-violet-700">({tr.potency}%)</span>
              </span>
              {line ? (
                <span className="mt-0.5 block font-medium text-zinc-700">{line}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Подпись с реальными данными Store: Metacritic, %, описание отзывов, число отзывов. */
function SteamMetricsLine({ card }: { card: SteamCard }) {
  const { t } = useI18n();
  const parts: React.ReactNode[] = [];

  if (card.metacritic != null) {
    parts.push(
      <span key="mc" className="font-semibold">
        {t("gameCard.metacriticShort", { n: card.metacritic })}
      </span>,
    );
  }

  if (card.reviewCount < 0) {
    if (card.positivePercent > 0) {
      parts.push(
        <span key="lp" className="text-zinc-600">
          {t("gameCard.positivePercent", {
            n: Math.round(card.positivePercent),
          })}
        </span>,
      );
    } else if (parts.length === 0) {
      parts.push(
        <span key="st" className="text-zinc-600">
          {t("gameCard.metricsFallback")}
        </span>,
      );
    }
  } else if (!card.hasUserReviews) {
    parts.push(
      <span key="nr" className="text-zinc-600">
        {t("gameCard.noUserReviewsSteam")}
      </span>,
    );
  } else {
    if (card.positivePercent > 0) {
      parts.push(
        <span key="pp" className="text-zinc-600">
          {t("gameCard.positivePercent", {
            n: Math.round(card.positivePercent),
          })}
        </span>,
      );
    } else if (card.reviewScoreDesc) {
      parts.push(
        <span key="rd" className="text-zinc-600">
          {card.reviewScoreDesc}
        </span>,
      );
    }
    if (card.reviewCount > 0) {
      parts.push(
        <span key="rc" className="text-zinc-500">
          {t("gameCard.reviewsTotal", { n: card.reviewCount })}
        </span>,
      );
    }
    if (parts.length === 0) {
      parts.push(
        <span key="st2" className="text-zinc-600">
          {t("gameCard.metricsFallback")}
        </span>,
      );
    }
  }

  return (
    <div className="mx-2 mb-2 rounded border border-zinc-400/60 bg-white/60 px-2 py-1 text-[9px] leading-snug text-zinc-700">
      {parts.map((node, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className="text-zinc-500"> · </span> : null}
          {node}
        </Fragment>
      ))}
    </div>
  );
}

export type GameCardProps = {
  card: SteamCard;
  /** Индекс для поочерёдной анимации при открытии пака (сетка) */
  entranceIndex?: number;
  /** Режим колоды: без «подъёма» при hover */
  variant?: "default" | "deck";
};

function pokemonHeaderStrip(r: Rarity): string {
  switch (r) {
    case "common":
      return "from-[#c4b8a8] to-[#a89b8c]";
    case "uncommon":
      return "from-[#7dd3a8] to-[#34a878]";
    case "rare":
      return "from-[#7ec8ff] to-[#3b82f6]";
    case "epic":
      return "from-[#d8b4fe] to-[#9333ea]";
    case "holo":
      return "from-[#a5f3fc] via-[#e9d5ff] to-[#22d3ee]";
    case "legend":
      return "from-[#fde047] via-[#fbbf24] to-[#f59e0b]";
    case "champion":
      return "from-[#fecdd3] via-[#fb7185] to-[#be123c]";
    default:
      return "from-zinc-400 to-zinc-500";
  }
}

function steamEnergyDots(count: number) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full border border-sky-950/25 bg-gradient-to-br from-sky-200 to-blue-600 shadow-[inset_0_-2px_3px_rgba(0,0,0,0.25)]"
        />
      ))}
    </span>
  );
}

function cardHpDisplayed(card: SteamCard): number {
  if (typeof card.hp === "number" && card.hp >= 40) return card.hp;
  return computeCardHp(card.atk, card.def, card.score);
}

export function GameCard({ card, entranceIndex, variant = "default" }: GameCardProps) {
  const { messages, t } = useI18n();
  const rl = messages.rarity;
  const gc = messages.gameCard;
  const animated = entranceIndex !== undefined;
  const delayMs = animated ? entranceIndex * 115 : undefined;
  const isDeck = variant === "deck";
  const isLegend = card.rarity === "legend";
  const isChampion = card.rarity === "champion";
  const isHolo = card.rarity === "holo";
  const hp = cardHpDisplayed(card);
  const weaknessMult = combatWeaknessMultiplier(card.rarity);
  const resistN = combatResistValue(card.def, card.rarity);
  const retreatDots = combatRetreatCost(card.rarity);

  return (
    <div
      className={animated ? "sg-card-enter" : undefined}
      style={
        delayMs !== undefined ? { animationDelay: `${delayMs}ms` } : undefined
      }
    >
      <article
        className={[
          "group relative flex w-full max-w-[min(92vw,280px)] flex-col overflow-hidden rounded-[12px]",
          "border-[5px] border-[#c9a227] bg-gradient-to-b from-[#fffef7] via-[#fdf3cf] to-[#ecd78a]",
          "shadow-[0_10px_32px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.7)]",
          isChampion
            ? "sg-pokemon-legend border-[#f43f5e] shadow-[0_0_0_2px_rgba(244,63,94,0.5),0_12px_44px_rgba(225,29,72,0.38)]"
            : isLegend
              ? "sg-pokemon-legend border-[#eab308] shadow-[0_0_0_2px_rgba(251,191,36,0.45),0_12px_40px_rgba(245,158,11,0.35)]"
              : isHolo
                ? "sg-pokemon-holo-tier border-[#22d3ee] shadow-[0_0_0_2px_rgba(34,211,238,0.42),0_12px_38px_rgba(192,38,211,0.28)]"
                : "",
          isDeck
            ? "select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
            : "transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragStart={isDeck ? (e) => e.preventDefault() : undefined}
      >
        {isChampion || isLegend ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-[7px] opacity-90 mix-blend-soft-light"
            aria-hidden
          >
            <div className="sg-pokemon-holo-sheen absolute inset-[-40%] rounded-[inherit]" />
          </div>
        ) : isHolo ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-[7px] opacity-[0.88] mix-blend-soft-light"
            aria-hidden
          >
            <div className="sg-pokemon-holo-tier-sheen absolute inset-[-40%] rounded-[inherit]" />
          </div>
        ) : null}

        <div className="relative z-[2] m-[3px] flex flex-col rounded-[7px] border-2 border-zinc-900 bg-[#fffbeb]">
          {/* Имя + HP — как в Pokémon */}
          <div
            className={`flex items-end justify-between gap-2 bg-gradient-to-r px-2.5 pb-1.5 pt-2 ${pokemonHeaderStrip(card.rarity)}`}
          >
            <h3 className="line-clamp-2 flex-1 font-[family-name:var(--font-geist-sans)] text-[15px] font-extrabold leading-tight tracking-tight text-zinc-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
              {card.name}
            </h3>
            <div className="flex shrink-0 items-end gap-1">
              <span className="text-[10px] font-bold text-zinc-900">HP</span>
              <span className="text-2xl font-black tabular-nums leading-none text-zinc-900">
                {hp}
              </span>
              <span
                className={`mb-0.5 flex h-6 min-w-6 max-w-[2.35rem] shrink-0 items-center justify-center rounded-full border-2 px-0.5 text-[10px] leading-none ${raritySteamTypeOrbClasses(card.rarity)}`}
                title={`${rarityTcgCode(card.rarity)} — ${rl[card.rarity]}`}
                aria-label={rl[card.rarity]}
              >
                <span className="translate-y-px font-black tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                  {rarityTcgCode(card.rarity)}
                </span>
              </span>
            </div>
          </div>

          <p className="flex flex-wrap items-center gap-x-1.5 px-2.5 pb-1 text-[10px] font-semibold italic text-zinc-700">
            <span>{gc.baseGame}</span>
            <span aria-hidden className="text-zinc-500">
              ·
            </span>
            <span>{rl[card.rarity]}</span>
          </p>

          {/* Окно иллюстрации */}
          <div className="mx-2 mb-2 mt-0.5 rounded-sm border-[3px] border-[#a16207] bg-[#fde68a] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
            <div className="relative aspect-square w-full overflow-hidden rounded-[1px] bg-zinc-950">
              {/* Steam header_image может быть с любого CDN-хоста — не полагаемся на remotePatterns next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.headerImage}
                alt={card.name}
                draggable={false}
                className={
                  isDeck
                    ? "pointer-events-none h-full w-full object-contain object-center"
                    : "h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03]"
                }
              />
            </div>
          </div>

          {/* ATK / DEF (как в ККИ) */}
          <div className="mx-2 mb-2 space-y-0 border-y-2 border-zinc-900/90 py-1.5">
            <div className="flex items-center gap-2 border-b border-dotted border-zinc-400/80 pb-1.5">
              {steamEnergyDots(2)}
              <span className="min-w-0 flex-1 text-[12px] font-bold text-zinc-900">
                {gc.attack}
              </span>
              <span
                className={`text-lg font-black tabular-nums ${rarityStatAccent(card.rarity)}`}
              >
                {card.atk}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1.5">
              {steamEnergyDots(1)}
              <span className="min-w-0 flex-1 text-[12px] font-bold text-zinc-900">
                {gc.defense}
              </span>
              <span
                className={`text-lg font-black tabular-nums ${rarityStatAccent(card.rarity)}`}
              >
                {card.def}
              </span>
            </div>
          </div>

          {/* Слабость / сопротивление / отступ */}
          <div className="mx-2 mb-2 grid grid-cols-3 gap-1 text-[8px] font-bold uppercase leading-tight text-zinc-800">
            <div>
              <span className="block text-zinc-500">{gc.weakness}</span>
              <span>×{weaknessMult}</span>
            </div>
            <div>
              <span className="block text-zinc-500">{gc.resist}</span>
              <span>
                {t("gameCard.resistValue", {
                  n: resistN,
                })}
              </span>
            </div>
            <div>
              <span className="block text-zinc-500">{gc.retreat}</span>
              <span className="flex gap-0.5 pt-0.5">
                {Array.from({ length: retreatDots }, (_, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full border border-zinc-600 bg-zinc-300"
                  />
                ))}
              </span>
            </div>
          </div>

          <CardTraitsBlock card={card} />

          {card.genres?.length ? (
            <p className="mx-2 mb-2 line-clamp-2 text-center text-[8px] font-semibold uppercase tracking-wide text-zinc-600">
              {card.genres.slice(0, 4).join(" · ")}
            </p>
          ) : null}

          <SteamMetricsLine card={card} />

          <Link
            href={card.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[5] mx-2 mb-2.5 flex touch-manipulation items-center justify-center gap-1 rounded border-2 border-zinc-800 bg-zinc-900 py-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-100 transition hover:bg-zinc-800 hover:text-white"
          >
            <span>{gc.store}</span>
            <span aria-hidden className="text-[10px]">
              ↗
            </span>
          </Link>
        </div>
      </article>
    </div>
  );
}
