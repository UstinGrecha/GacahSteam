import { syncAchievements } from "@/lib/achievements/sync";
import { applySellCardAtSlot } from "@/lib/economy/applySellCard";
import {
  DUST_PER_TRIPLE_SALVAGE,
  DUST_REROLL_SLOT,
  PITY_PACKS,
} from "@/lib/economy/constants";
import {
  applyLoginStreakUtc,
  consumeStandardFreePackUtc,
  economySyncUtc,
  getFreeStandardOpensAfterUtcSync,
} from "@/lib/economy/syncUtc";
import { buildSteamCard } from "@/lib/gacha/buildCard";
import { getPrisma } from "@/lib/db/prisma";
import {
  fetchOneNewCardFromDbPool,
  openPackFromDbPool,
} from "@/lib/gacha/openPack";
import { RAID_BOSS_REWARD_APPIDS } from "@/lib/gacha/raidReward";
import { currentRaidWeekKey } from "@/lib/raid/weeklyBoss";
import { fetchSteamPoolResponseForIds } from "@/lib/steam/steamPoolDb";
import { packCoinCost, type PackKind } from "@/lib/gacha/packKinds";
import {
  isSeriesPacksAvailable,
  type CardSeries,
} from "@/lib/gacha/steamPools";
import { isRarePlus } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";
import {
  defaultState,
  hydrateStoredStateFromApi,
} from "@/lib/storage/persist";
import type { StoredState } from "@/lib/storage/types";
import { randomInt, randomUUID } from "node:crypto";

const RAID_REWARD_SERIES = 1 as CardSeries;

function weekKeyOk(key: string): boolean {
  return /^\d{4}-W\d{2}$/.test(key);
}

function cloneState(s: StoredState): StoredState {
  return JSON.parse(JSON.stringify(s)) as StoredState;
}

function serializeState(s: StoredState): string {
  return JSON.stringify(s);
}

function deserializePayload(raw: string | null | undefined): StoredState {
  if (!raw?.trim()) return defaultState();
  try {
    return hydrateStoredStateFromApi(JSON.parse(raw) as unknown);
  } catch {
    return defaultState();
  }
}

function serverRng(): () => number {
  return () => randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function sanitizeState(s: StoredState): void {
  s.coins = Math.min(1_000_000_000, Math.max(0, Math.floor(s.coins)));
  s.dust = Math.min(1_000_000_000, Math.max(0, Math.floor(s.dust)));
  if (s.pulls.length > 10_000) {
    s.pulls = s.pulls.slice(-10_000);
  }
}

async function loadAndSync(userId: string): Promise<StoredState> {
  const prisma = getPrisma();
  const row = await prisma.gameSave.findUnique({ where: { userId } });
  let state = row ? deserializePayload(row.payload) : defaultState();
  applyLoginStreakUtc(state);
  economySyncUtc(state);
  syncAchievements(state);
  await prisma.gameSave.upsert({
    where: { userId },
    create: { userId, payload: serializeState(state) },
    update: { payload: serializeState(state) },
  });
  return state;
}

export async function getSyncedGameState(
  userId: string,
): Promise<StoredState> {
  const state = await loadAndSync(userId);
  return cloneState(state);
}

export type OpenPackResult =
  | {
      ok: true;
      state: StoredState;
      cards: SteamCard[];
      pullId: string;
    }
  | { ok: false; code: string; message?: string };

export type RaidRewardResult =
  | { ok: true; state: StoredState; card: SteamCard; pullId: string }
  | { ok: false; code: string; message?: string };

export async function serverClaimRaidBossReward(
  userId: string,
  weekKey: string,
): Promise<RaidRewardResult> {
  if (!weekKeyOk(weekKey)) {
    return { ok: false, code: "invalid_week" };
  }
  const expected = currentRaidWeekKey();
  if (weekKey !== expected) {
    return { ok: false, code: "week_mismatch" };
  }

  try {
    const prisma = getPrisma();
    let state = await loadAndSync(userId);

    if (state.raid.lastRewardWeekKey === weekKey) {
      return { ok: false, code: "already_claimed" };
    }

    const rewardIds = [...RAID_BOSS_REWARD_APPIDS];
    const pool = await fetchSteamPoolResponseForIds(
      rewardIds,
      RAID_REWARD_SERIES,
    );
    for (const appid of rewardIds) {
      const row = pool[String(appid)];
      if (!row?.success || !row.data) {
        return {
          ok: false,
          code: "pool_missing",
          message: "Raid reward game is not in Steam pool (run seed:raid-reward).",
        };
      }
    }

    const rewardAppId = rewardIds[randomInt(0, rewardIds.length)];
    const entry = pool[String(rewardAppId)];
    const data = entry?.data;
    if (!entry?.success || !data) {
      return { ok: false, code: "build_failed" };
    }
    const card = buildSteamCard(rewardAppId, data);
    if (!card || card.rarity !== "champion") {
      return { ok: false, code: "build_failed" };
    }
    const pullId = randomUUID();

    state.pulls.push({
      id: pullId,
      openedAt: new Date().toISOString(),
      cards: [card],
    });
    const k = String(card.appid);
    state.spareCopies[k] = (state.spareCopies[k] ?? 0) + 1;
    state.raid = { lastRewardWeekKey: weekKey };

    syncAchievements(state);

    await prisma.gameSave.upsert({
      where: { userId },
      create: { userId, payload: serializeState(state) },
      update: { payload: serializeState(state) },
    });

    return { ok: true, state: cloneState(state), card, pullId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "raid_reward_failed";
    return { ok: false, code: "error", message };
  }
}

export async function serverOpenPack(
  userId: string,
  packKind: PackKind,
  series: CardSeries,
): Promise<OpenPackResult> {
  try {
    const prisma = getPrisma();
    let state = await loadAndSync(userId);

    const openCost = packCoinCost(packKind);
    if (!isSeriesPacksAvailable(series)) {
      return { ok: false, code: "series_unavailable" };
    }
    if (openCost === null) {
      if (getFreeStandardOpensAfterUtcSync(state) <= 0) {
        return { ok: false, code: "no_free" };
      }
    } else if (state.coins < (openCost ?? 0)) {
      return { ok: false, code: "need_coins" };
    }

    const rng = serverRng();
    const forcePity = state.pity.packsSinceRarePlus >= PITY_PACKS;
    const result = await openPackFromDbPool(series, rng, {
      packKind,
      forcePityRarePlus: forcePity,
    });

    const pullId = randomUUID();
    const hadRarePlus = result.cards.some((c) => isRarePlus(c.rarity));

    state.pulls.push({
      id: pullId,
      openedAt: new Date().toISOString(),
      cards: result.cards,
    });
    for (const c of result.cards) {
      const k = String(c.appid);
      state.spareCopies[k] = (state.spareCopies[k] ?? 0) + 1;
    }
    if (packKind === "standard") {
      consumeStandardFreePackUtc(state);
    } else {
      const c = packCoinCost(packKind);
      if (c != null) state.coins -= c;
    }
    state.daily.packsOpenedToday += 1;
    if (hadRarePlus) {
      state.pity.packsSinceRarePlus = 0;
    } else {
      state.pity.packsSinceRarePlus += 1;
    }
    if (result.pityActivated) {
      state.pityActivations += 1;
    }

    syncAchievements(state);

    await prisma.gameSave.upsert({
      where: { userId },
      create: { userId, payload: serializeState(state) },
      update: { payload: serializeState(state) },
    });

    return { ok: true, state: cloneState(state), cards: result.cards, pullId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "open_failed";
    return { ok: false, code: "steam_or_logic", message };
  }
}

export type RerollResult =
  | { ok: true; state: StoredState; cards: SteamCard[] }
  | { ok: false; code: string; message?: string };

export async function serverRerollSlot(
  userId: string,
  pullId: string,
  series: CardSeries,
  packKind: PackKind,
): Promise<RerollResult> {
  try {
    const prisma = getPrisma();
    let state = await loadAndSync(userId);

    if (state.dust < DUST_REROLL_SLOT) {
      return { ok: false, code: "need_dust" };
    }

    const last = state.pulls[state.pulls.length - 1];
    if (!last || last.id !== pullId) {
      return { ok: false, code: "not_latest_pull" };
    }

    const current = last.cards;
    if (!current.length) {
      return { ok: false, code: "bad_pull" };
    }

    const rng = serverRng();
    const exclude = new Set(current.map((c) => c.appid));
    const idx = randomInt(0, current.length);
    const oldCard = current[idx]!;
    const newCard = await fetchOneNewCardFromDbPool(series, rng, exclude, packKind);
    if (!newCard) {
      return { ok: false, code: "replace_failed" };
    }

    const next = [...current];
    next[idx] = newCard;

    const p = state.pulls.find((x) => x.id === pullId);
    if (p) p.cards = next;
    state.dust -= DUST_REROLL_SLOT;
    const ko = String(oldCard.appid);
    const kn = String(newCard.appid);
    state.spareCopies[ko] = Math.max(0, (state.spareCopies[ko] ?? 0) - 1);
    state.spareCopies[kn] = (state.spareCopies[kn] ?? 0) + 1;
    const hadRarePlus = next.some((c) => isRarePlus(c.rarity));
    if (hadRarePlus) state.pity.packsSinceRarePlus = 0;

    syncAchievements(state);

    await prisma.gameSave.upsert({
      where: { userId },
      create: { userId, payload: serializeState(state) },
      update: { payload: serializeState(state) },
    });

    return { ok: true, state: cloneState(state), cards: next };
  } catch (e) {
    const message = e instanceof Error ? e.message : "reroll_failed";
    return { ok: false, code: "error", message };
  }
}

export type SalvageResult =
  | { ok: true; state: StoredState }
  | { ok: false; code: string };

export async function serverSalvage(
  userId: string,
  appid: number,
): Promise<SalvageResult> {
  const prisma = getPrisma();
  let state = await loadAndSync(userId);
  const k = String(appid);
  if ((state.spareCopies[k] ?? 0) < 3) {
    return { ok: false, code: "not_enough_copies" };
  }
  state.spareCopies[k] -= 3;
  state.dust += DUST_PER_TRIPLE_SALVAGE;
  state.salvageCount += 1;
  syncAchievements(state);
  await prisma.gameSave.upsert({
    where: { userId },
    create: { userId, payload: serializeState(state) },
    update: { payload: serializeState(state) },
  });
  return { ok: true, state: cloneState(state) };
}

export type SellCardServerResult =
  | { ok: true; state: StoredState; coinsGained: number }
  | { ok: false; code: string };

export async function serverSellCard(
  userId: string,
  pullId: string,
  slotIndex: number,
): Promise<SellCardServerResult> {
  try {
    const prisma = getPrisma();
    let state = await loadAndSync(userId);
    const sold = applySellCardAtSlot(state, pullId, slotIndex);
    if (!sold.ok) {
      return { ok: false, code: sold.code };
    }
    sanitizeState(state);
    syncAchievements(state);
    await prisma.gameSave.upsert({
      where: { userId },
      create: { userId, payload: serializeState(state) },
      update: { payload: serializeState(state) },
    });
    return {
      ok: true,
      state: cloneState(state),
      coinsGained: sold.coinsGained,
    };
  } catch {
    return { ok: false, code: "error" };
  }
}

export async function serverResetGame(userId: string): Promise<StoredState> {
  const prisma = getPrisma();
  const fresh = defaultState();
  applyLoginStreakUtc(fresh);
  economySyncUtc(fresh);
  syncAchievements(fresh);
  await prisma.gameSave.upsert({
    where: { userId },
    create: { userId, payload: serializeState(fresh) },
    update: { payload: serializeState(fresh) },
  });
  return cloneState(fresh);
}

export async function serverImportState(
  userId: string,
  raw: unknown,
): Promise<StoredState> {
  const prisma = getPrisma();
  let state =
    typeof raw === "string"
      ? deserializePayload(raw)
      : hydrateStoredStateFromApi(raw);
  sanitizeState(state);
  applyLoginStreakUtc(state);
  economySyncUtc(state);
  syncAchievements(state);
  await prisma.gameSave.upsert({
    where: { userId },
    create: { userId, payload: serializeState(state) },
    update: { payload: serializeState(state) },
  });
  return cloneState(state);
}

/** Однократный перенос с клиента, только если на сервере ещё нет открытых паков. */
export async function serverMigrateIfEmpty(
  userId: string,
  raw: unknown,
): Promise<{ migrated: boolean; state: StoredState }> {
  const prisma = getPrisma();
  const row = await prisma.gameSave.findUnique({ where: { userId } });
  const existing = row ? deserializePayload(row.payload) : defaultState();
  if (existing.pulls.length > 0) {
    const state = await getSyncedGameState(userId);
    return { migrated: false, state };
  }
  let incoming = hydrateStoredStateFromApi(raw);
  sanitizeState(incoming);
  applyLoginStreakUtc(incoming);
  economySyncUtc(incoming);
  syncAchievements(incoming);
  await prisma.gameSave.upsert({
    where: { userId },
    create: { userId, payload: serializeState(incoming) },
    update: { payload: serializeState(incoming) },
  });
  return { migrated: true, state: cloneState(incoming) };
}
