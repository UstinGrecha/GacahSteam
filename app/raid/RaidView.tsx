"use client";

import { rarityTcgCode } from "@/components/rarityStyles";
import { useI18n } from "@/components/I18nProvider";
import { useGameStorage } from "@/components/StorageProvider";
import { buildSteamCard } from "@/lib/gacha/buildCard";
import { RAID_BOSS_REWARD_APPIDS } from "@/lib/gacha/raidReward";
import type { Rarity } from "@/lib/gacha/types";
import {
  advanceRaidStep,
  buildRaidBattleSummary,
  createRaidRun,
  currentRaidBoss,
  currentRaidWeekKey,
  isBossEnraged,
} from "@/lib/raid";
import type { RaidCardPick, RaidRunState } from "@/lib/raid/types";
import type { SteamAppDetailsResponse } from "@/lib/steam/types";
import { addCardsToSpareCopies } from "@/lib/storage/spareCopies";
import type { PullRecord } from "@/lib/storage/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SQUAD_RARITY_ORDER: Rarity[] = [
  "champion",
  "legend",
  "holo",
  "epic",
  "rare",
  "uncommon",
  "common",
];

type FlatEntry = RaidCardPick & { openedAt: string; key: string };

type CombatPopup = {
  id: string;
  slot: number;
  label: string;
  variant: "hero" | "boss" | "heal";
};

function useFlatCollection(pulls: PullRecord[]): FlatEntry[] {
  return useMemo(
    () =>
      [...pulls]
        .sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
        )
        .flatMap((pull) =>
          pull.cards.map((c, slotIndex) => ({
            pullId: pull.id,
            slotIndex,
            card: c,
            openedAt: pull.openedAt,
            key: `${pull.id}:${slotIndex}`,
          })),
        ),
    [pulls],
  );
}

export function RaidView() {
  const { state, commit, refresh, serverAuthoritative } = useGameStorage();
  const { t, messages } = useI18n();
  const rl = messages.rarity;
  const raidCopy = messages.raid;

  const flat = useFlatCollection(state.pulls);
  const [squadRarity, setSquadRarity] = useState<Rarity | "all">("all");
  const filteredFlat = useMemo(() => {
    if (squadRarity === "all") return flat;
    return flat.filter((e) => e.card.rarity === squadRarity);
  }, [flat, squadRarity]);
  const boss = useMemo(() => currentRaidBoss(), []);
  const weekLabel = currentRaidWeekKey();

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [raid, setRaid] = useState<RaidRunState | null>(null);
  const [auto, setAuto] = useState(false);
  const [fastPace, setFastPace] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const prevLogLenRef = useRef(0);
  const [lungeSlot, setLungeSlot] = useState<number | null>(null);
  const [bossThump, setBossThump] = useState(false);
  const [hitSlots, setHitSlots] = useState<Set<number>>(() => new Set());
  const [popups, setPopups] = useState<CombatPopup[]>([]);
  const [raidRewardLine, setRaidRewardLine] = useState<string | null>(null);
  const [raidRewardError, setRaidRewardError] = useState<string | null>(null);
  const raidClaimInFlight = useRef(false);

  const byKey = useMemo(() => {
    const m = new Map<string, FlatEntry>();
    for (const e of flat) m.set(e.key, e);
    return m;
  }, [flat]);

  const battleSummary = useMemo(
    () => (raid ? buildRaidBattleSummary(raid) : null),
    [raid],
  );

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const i = prev.indexOf(key);
      if (i >= 0) return prev.filter((k) => k !== key);
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });
  }, []);

  const startRaid = useCallback(() => {
    if (selectedKeys.length !== 5) return;
    const picks: RaidCardPick[] = selectedKeys
      .map((k) => byKey.get(k))
      .filter((x): x is FlatEntry => Boolean(x));
    if (picks.length !== 5) return;
    setAuto(false);
    setRaid(createRaidRun(boss, picks));
  }, [selectedKeys, byKey, boss]);

  const resetAll = useCallback(() => {
    setRaid(null);
    setAuto(false);
    setPopups([]);
  }, []);

  useEffect(() => {
    if (!raid) {
      setRaidRewardLine(null);
      setRaidRewardError(null);
    }
  }, [raid]);

  useEffect(() => {
    if (!raid || raid.outcome !== "victory") return;
    const wk = currentRaidWeekKey();
    if (state.raid.lastRewardWeekKey === wk) return;
    if (raidClaimInFlight.current) return;
    raidClaimInFlight.current = true;
    setRaidRewardError(null);

    void (async () => {
      try {
        if (serverAuthoritative) {
          const res = await fetch("/api/game/raid-reward", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weekKey: wk }),
          });
          const j = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
            card?: { name?: string };
          };
          if (res.status === 409) {
            setRaidRewardError(t("raid.rewardAlready"));
            await refresh();
          } else if (!res.ok) {
            if (j.error === "pool_missing") {
              setRaidRewardError(t("raid.rewardPoolMissing"));
            } else {
              setRaidRewardError(
                typeof j.message === "string" && j.message
                  ? j.message
                  : t("raid.rewardFail"),
              );
            }
          } else {
            const name =
              typeof j.card?.name === "string"
                ? j.card.name
                : t("raid.rewardCardFallback");
            setRaidRewardLine(t("raid.rewardBody", { name }));
            await refresh();
          }
        } else {
          const idsParam = RAID_BOSS_REWARD_APPIDS.join(",");
          const res = await fetch(
            `/api/steam/pool-details?ids=${idsParam}&series=1`,
          );
          if (!res.ok) {
            setRaidRewardError(t("raid.rewardFail"));
            return;
          }
          const merged = (await res.json()) as SteamAppDetailsResponse;
          const available = RAID_BOSS_REWARD_APPIDS.filter((appid) => {
            const row = merged[String(appid)];
            return Boolean(row?.success && row.data);
          });
          if (available.length === 0) {
            setRaidRewardError(t("raid.rewardPoolMissing"));
            return;
          }
          const pick =
            available[Math.floor(Math.random() * available.length)]!;
          const row = merged[String(pick)];
          const poolData = row?.data;
          if (!row?.success || !poolData) {
            setRaidRewardError(t("raid.rewardFail"));
            return;
          }
          const trophy = buildSteamCard(pick, poolData);
          if (!trophy || trophy.rarity !== "champion") {
            setRaidRewardError(t("raid.rewardFail"));
            return;
          }
          commit((draft) => {
            draft.raid ??= { lastRewardWeekKey: null };
            if (draft.raid.lastRewardWeekKey === wk) return;
            draft.raid.lastRewardWeekKey = wk;
            draft.pulls.push({
              id: crypto.randomUUID(),
              openedAt: new Date().toISOString(),
              cards: [trophy],
            });
            addCardsToSpareCopies(draft, [trophy]);
          });
          setRaidRewardLine(t("raid.rewardBody", { name: trophy.name }));
        }
      } catch {
        setRaidRewardError(t("raid.rewardFail"));
      } finally {
        raidClaimInFlight.current = false;
      }
    })();
  }, [
    raid,
    raid?.outcome,
    state.raid.lastRewardWeekKey,
    serverAuthoritative,
    refresh,
    commit,
    t,
  ]);

  const step = useCallback(() => {
    setRaid((r) => (r && r.outcome === "ongoing" ? advanceRaidStep(r) : r));
  }, []);

  const autoMs = fastPace ? 520 : 960;

  useEffect(() => {
    if (!auto || !raid || raid.outcome !== "ongoing") return;
    const id = window.setInterval(() => {
      setRaid((r) => (r && r.outcome === "ongoing" ? advanceRaidStep(r) : r));
    }, autoMs);
    return () => window.clearInterval(id);
  }, [auto, autoMs, raid?.outcome]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [raid?.log.length]);

  useEffect(() => {
    if (!raid) {
      prevLogLenRef.current = 0;
      setLungeSlot(null);
      setBossThump(false);
      setHitSlots(new Set());
      setPopups([]);
      return undefined;
    }
    const len = raid.log.length;
    if (len <= prevLogLenRef.current) {
      return undefined;
    }
    const last = raid.log[len - 1]!;
    prevLogLenRef.current = len;

    const timers: number[] = [];

    if (last.kind === "player_attack") {
      setLungeSlot(last.slot);
      setBossThump(true);
      const pid = `p-${len}-${Date.now()}`;
      setPopups((prev) => [
        ...prev,
        { id: pid, slot: last.slot, label: String(last.damage), variant: "hero" },
        ...(last.heal
          ? [
              {
                id: `${pid}-h`,
                slot: last.slot,
                label: String(last.heal),
                variant: "heal" as const,
              },
            ]
          : []),
      ]);
      timers.push(
        window.setTimeout(() => setLungeSlot(null), 580),
        window.setTimeout(() => setBossThump(false), 500),
        window.setTimeout(
          () =>
            setPopups((prev) =>
              prev.filter((x) => x.id !== pid && x.id !== `${pid}-h`),
            ),
          840,
        ),
      );
    } else if (last.kind === "boss_slaughter") {
      setHitSlots(new Set(last.hits.map((h) => h.slot)));
      timers.push(
        window.setTimeout(() => setHitSlots(new Set()), 640),
      );
      last.hits.forEach((h, idx) => {
        const tid = window.setTimeout(() => {
          const bid = `b-${len}-${idx}-${h.slot}`;
          setPopups((prev) => [
            ...prev,
            {
              id: bid,
              slot: h.slot,
              label: String(h.damage),
              variant: "boss",
            },
          ]);
          timers.push(
            window.setTimeout(
              () => setPopups((prev) => prev.filter((x) => x.id !== bid)),
              780,
            ),
          );
        }, idx * 88);
        timers.push(tid);
      });
    }

    return () => {
      for (const x of timers) window.clearTimeout(x);
    };
  }, [raid, raid?.log]);

  const bossName = raidCopy.bossNames[boss.nameKey] ?? boss.nameKey;
  const enraged =
    raid != null && isBossEnraged(raid.bossHp, raid.boss.maxHp);
  const mvpName =
    battleSummary && raid
      ? raid.party[battleSummary.mvpSlot]?.card.name ?? "—"
      : "—";

  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8">
      <header className="rounded-2xl border border-red-900/50 bg-gradient-to-br from-red-950/60 via-zinc-950 to-zinc-950 p-5 shadow-[0_0_40px_rgba(127,29,29,0.15)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-300/90">
          {t("raid.week", { week: weekLabel })}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-50">
          {t("raid.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {t("raid.subtitle")}
        </p>

        <div className="mt-5 grid gap-3 rounded-xl border border-red-800/40 bg-black/30 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase text-red-400/90">
              {t("raid.bossHeading")}
            </p>
            <p className="text-xl font-black text-red-100">{bossName}</p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-zinc-300">
              <div>
                <dt className="text-zinc-500">{t("raid.bossHp")}</dt>
                <dd className="font-bold text-zinc-100">{boss.maxHp}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("raid.bossAtk")}</dt>
                <dd className="font-bold text-zinc-100">{boss.atk}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("raid.bossDef")}</dt>
                <dd className="font-bold text-zinc-100">{boss.def}</dd>
              </div>
            </dl>
          </div>
          {raid ? (
            <div
              className={
                bossThump
                  ? "sg-raid-boss-thump min-w-[200px] rounded-lg"
                  : enraged
                    ? "sg-raid-enrage-bar min-w-[200px] rounded-lg"
                    : "min-w-[200px] rounded-lg"
              }
            >
              <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                <span>
                  {t("raid.bossHp")}
                  {enraged ? (
                    <span className="ml-1 text-red-400">
                      ({t("raid.enrageBar")})
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums text-zinc-200">
                  {raid.bossHp} / {raid.boss.maxHp}
                </span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={[
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    enraged
                      ? "bg-gradient-to-r from-red-700 via-orange-500 to-amber-400"
                      : "bg-gradient-to-r from-red-600 to-amber-500",
                  ].join(" ")}
                  style={{
                    width: `${Math.max(0, Math.min(100, (raid.bossHp / raid.boss.maxHp) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {!raid ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-bold text-zinc-100">{t("raid.squadTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("raid.squadHint")}</p>
          <p className="mt-1 text-[11px] text-violet-300/80">{t("raid.traitsHint")}</p>
          <p className="mt-2 text-sm font-semibold text-amber-200/90">
            {t("raid.selected", { n: selectedKeys.length })}
          </p>

          {selectedKeys.length > 0 ? (
            <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950/50 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                {t("raid.squadStrip")}
              </p>
              <ol className="flex flex-nowrap justify-center gap-2 overflow-x-auto py-1">
                {selectedKeys.map((k, ord) => {
                  const e = byKey.get(k);
                  if (!e) return null;
                  return (
                    <li
                      key={k}
                      className="flex w-[56px] shrink-0 flex-col items-center gap-1"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] font-black text-white">
                        {ord + 1}
                      </span>
                      <div className="w-full overflow-hidden rounded-md border border-zinc-600">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={e.card.headerImage}
                          alt=""
                          className="aspect-[92/43] w-full object-cover"
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          {flat.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">{t("raid.emptyCollection")}</p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label className="flex min-w-0 flex-col gap-1 text-sm text-zinc-400 sm:flex-row sm:items-center sm:gap-2">
                  <span className="shrink-0 font-medium text-zinc-500">
                    {t("raid.rarityFilter")}
                  </span>
                  <select
                    value={squadRarity}
                    onChange={(e) =>
                      setSquadRarity(e.target.value as Rarity | "all")
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none sm:w-auto sm:min-w-[200px]"
                    aria-label={t("raid.rarityFilter")}
                  >
                    <option value="all">{t("collection.allRarities")}</option>
                    {SQUAD_RARITY_ORDER.map((r) => (
                      <option key={r} value={r}>
                        {rarityTcgCode(r)} · {rl[r]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filteredFlat.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">{t("raid.noCardsThisRarity")}</p>
              ) : (
                <div className="mt-4 max-h-[min(60vh,520px)] overflow-y-auto overflow-x-hidden">
                  <ul className="flex snap-x snap-mandatory flex-nowrap gap-3 overflow-x-auto pb-3 pt-1 [-webkit-overflow-scrolling:touch]">
                    {filteredFlat.map((e) => {
                      const on = selectedKeys.includes(e.key);
                      return (
                        <li key={e.key} className="shrink-0 snap-start">
                          <button
                            type="button"
                            onClick={() => toggleKey(e.key)}
                            title={t("raid.toggleSelect")}
                            className={[
                              "flex w-[124px] flex-col rounded-xl border-2 p-2 text-left transition",
                              on
                                ? "border-sky-500 bg-sky-950/50 ring-2 ring-sky-500/30"
                                : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-600",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black",
                                on ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-500",
                              ].join(" ")}
                            >
                              {on ? selectedKeys.indexOf(e.key) + 1 : "·"}
                            </span>
                            <div className="overflow-hidden rounded-md border border-zinc-700 bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={e.card.headerImage}
                                alt=""
                                className="aspect-[92/43] w-full object-cover"
                              />
                            </div>
                            <span className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-[11px] font-semibold leading-tight text-zinc-100">
                              {e.card.name}
                            </span>
                            <span className="mt-1 text-[9px] leading-tight text-zinc-500">
                              {rarityTcgCode(e.card.rarity)} · ATK {e.card.atk}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selectedKeys.length !== 5}
              onClick={startRaid}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("raid.start")}
            </button>
            {selectedKeys.length !== 5 ? (
              <span className="self-center text-xs text-zinc-500">
                {t("raid.needFive")}
              </span>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-200">
                {raid.outcome === "ongoing"
                  ? raid.phase === "heroes"
                    ? t("raid.phaseHeroes")
                    : t("raid.phaseBoss")
                  : raid.outcome === "victory"
                    ? t("raid.victory")
                    : t("raid.defeat")}
              </p>
              <p className="text-xs tabular-nums text-zinc-500">
                {t("raid.round", { n: raid.round })}
              </p>
            </div>

            {enraged && raid.outcome === "ongoing" ? (
              <p className="mt-2 rounded-lg border border-red-500/40 bg-red-950/35 px-3 py-2 text-xs font-semibold text-red-200/95">
                {t("raid.enrageBanner")}
              </p>
            ) : null}

            {raid.outcome === "ongoing" && raid.phase === "boss" ? (
              <p className="mt-2 text-xs font-semibold text-red-300/90">
                {t("raid.bossPhaseWarn")}
              </p>
            ) : null}

            <div
              className={[
                "relative mt-4 overflow-hidden rounded-2xl border border-zinc-800/80 bg-[radial-gradient(ellipse_at_50%_0%,rgba(127,29,29,0.35),transparent_55%),linear-gradient(180deg,rgba(24,24,27,0.9),rgba(0,0,0,0.85))] px-2 py-6 sm:px-4",
                raid.outcome === "ongoing" && raid.phase === "boss"
                  ? "sg-raid-boss-phase-arena"
                  : "",
              ].join(" ")}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(248,113,113,0.12),transparent_45%)]" />
              <div className="relative mb-4 flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-900/60 bg-gradient-to-br from-red-950 via-zinc-900 to-black shadow-[0_0_40px_rgba(220,38,38,0.2)]">
                  <span className="line-clamp-4 px-1 text-center text-[9px] font-black uppercase leading-tight tracking-tight text-red-200/90">
                    {bossName}
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-400/70">
                  {t("raid.bossHeading")}
                </p>
              </div>

              <ul className="relative flex flex-nowrap items-end justify-center gap-1.5 overflow-x-auto pb-1 sm:gap-3 md:gap-4 [-webkit-overflow-scrolling:touch]">
                {raid.party.map((m, i) => {
                  const isTurn =
                    raid.outcome === "ongoing" &&
                    raid.phase === "heroes" &&
                    raid.activeSlot === i &&
                    m.hp > 0;
                  const isLunging = lungeSlot === i;
                  const isHit = hitSlots.has(i);
                  const hpPct =
                    m.maxHp > 0 ? Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100)) : 0;
                  return (
                    <li
                      key={`${m.pullId}-${m.slotIndex}`}
                      className={[
                        "relative flex w-[78px] shrink-0 flex-col items-stretch sm:w-[94px] md:w-[102px]",
                        isLunging ? "sg-raid-card-lunge" : "",
                        isHit ? "sg-raid-card-hit" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div
                        className={[
                          "relative flex flex-col overflow-hidden rounded-xl border-2 bg-zinc-950/90 shadow-lg transition-[border-color,box-shadow]",
                          isTurn
                            ? "border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.4)]"
                            : "border-zinc-600",
                          m.hp <= 0 ? "opacity-40 grayscale" : "",
                        ].join(" ")}
                      >
                        <span className="bg-zinc-900 py-0.5 text-center text-[10px] font-black tabular-nums text-zinc-400">
                          {i + 1}
                        </span>
                        <div className="h-1 w-full bg-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-300"
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>
                        <div className="relative aspect-[92/43] w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.card.headerImage}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          {popups
                            .filter((p) => p.slot === i)
                            .map((p) => (
                              <span
                                key={p.id}
                                className={[
                                  "sg-raid-float-dmg absolute left-1/2 top-1/4 z-10 -translate-x-1/2 text-base",
                                  p.variant === "heal"
                                    ? "sg-raid-float-heal"
                                    : p.variant === "boss"
                                      ? "sg-raid-float-boss"
                                      : "sg-raid-float-hero",
                                ].join(" ")}
                              >
                                {p.variant === "heal" ? "+" : "−"}
                                {p.label}
                              </span>
                            ))}
                        </div>
                        <div className="border-t border-zinc-800 px-1 py-1">
                          <p className="line-clamp-2 text-[9px] font-semibold leading-tight text-zinc-200">
                            {m.card.name}
                          </p>
                          <p className="mt-0.5 text-[8px] tabular-nums text-zinc-500">
                            HP {m.hp}/{m.maxHp} · {rarityTcgCode(m.card.rarity)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {raid.outcome !== "ongoing" && battleSummary ? (
              <div
                className={[
                  "mt-4 rounded-xl border p-4",
                  raid.outcome === "victory"
                    ? "border-emerald-800/50 bg-emerald-950/25"
                    : "border-red-900/40 bg-red-950/20",
                ].join(" ")}
              >
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-zinc-200">
                  {t("raid.summaryTitle")}
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
                  <li>{t("raid.summaryTotalDmg", { n: battleSummary.totalDamageToBoss })}</li>
                  <li>
                    {t("raid.summaryMvp", {
                      name: mvpName,
                      n: battleSummary.damageBySlot[battleSummary.mvpSlot] ?? 0,
                    })}
                  </li>
                  <li>{t("raid.summaryHeals", { n: battleSummary.totalHealing })}</li>
                  <li>
                    {t("raid.summaryHeroAttacks", { n: battleSummary.heroAttacks })}
                  </li>
                  <li>
                    {t("raid.summaryBossPhases", { n: battleSummary.bossHitsSurvived })}
                  </li>
                </ul>
              </div>
            ) : null}

            {raid.outcome === "victory" && raidRewardLine ? (
              <div className="mt-4 rounded-xl border border-rose-500/45 bg-rose-950/25 p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-rose-200">
                  {t("raid.rewardTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-rose-100/95">
                  {raidRewardLine}
                </p>
              </div>
            ) : null}
            {raid.outcome === "victory" && raidRewardError ? (
              <div className="mt-4 rounded-xl border border-amber-600/40 bg-amber-950/25 p-3 text-sm text-amber-100">
                {raidRewardError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {raid.outcome === "ongoing" ? (
                <>
                  <button
                    type="button"
                    onClick={step}
                    className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-white"
                  >
                    {t("raid.nextStep")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuto((a) => !a)}
                    className={[
                      "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                      auto
                        ? "border-amber-500 bg-amber-950/40 text-amber-200"
                        : "border-zinc-600 text-zinc-300 hover:border-zinc-500",
                    ].join(" ")}
                  >
                    {auto ? t("raid.stopAuto") : t("raid.autoPlay")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFastPace((f) => !f)}
                    className="rounded-xl border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  >
                    {fastPace ? t("raid.speedNormal") : t("raid.speedFast")}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={resetAll}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              >
                {t("raid.reset")}
              </button>
            </div>
          </div>

          <div className="flex max-h-[min(70vh,560px)] flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
            <h3 className="shrink-0 text-sm font-bold text-zinc-300">
              {t("raid.logTitle")}
            </h3>
            <ul className="mt-2 flex-1 space-y-2 overflow-y-auto text-xs leading-snug text-zinc-400">
              {raid.log.map((e, i) => {
                if (e.kind === "player_attack") {
                  return (
                    <li
                      key={i}
                      className="rounded-lg border border-amber-900/30 bg-amber-950/15 px-2 py-1.5 text-amber-100/90"
                    >
                      {t("raid.heroAttack", {
                        name: e.actor,
                        dmg: e.damage,
                        hp: e.bossHpAfter,
                      })}
                      {e.heal ? (
                        <span className="font-medium text-emerald-400/90">
                          {t("raid.logHeal", { n: e.heal })}
                        </span>
                      ) : null}
                    </li>
                  );
                }
                if (e.kind === "boss_slaughter") {
                  return (
                    <li
                      key={i}
                      className="rounded-lg border border-red-900/50 bg-red-950/20 px-2 py-1.5"
                    >
                      <span className="font-bold text-red-200/90">
                        {t("raid.phaseBoss")}
                        {e.enraged ? t("raid.logEnrageActive") : ""}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {e.hits.map((h, j) => (
                          <li key={j} className="text-zinc-400">
                            {t("raid.bossHit", {
                              name: h.name,
                              dmg: h.damage,
                              hp: h.hpAfter,
                            })}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                if (e.kind === "victory") {
                  return (
                    <li
                      key={i}
                      className="rounded-lg bg-emerald-950/40 px-2 py-1.5 font-bold text-emerald-300"
                    >
                      {t("raid.victory")}
                    </li>
                  );
                }
                return (
                  <li
                    key={i}
                    className="rounded-lg bg-red-950/30 px-2 py-1.5 font-bold text-red-300"
                  >
                    {t("raid.defeat")}
                  </li>
                );
              })}
              <div ref={logEndRef} />
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
