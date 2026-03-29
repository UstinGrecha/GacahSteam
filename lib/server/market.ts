import { syncAchievements } from "@/lib/achievements/sync";
import {
  applyLoginStreakUtc,
  economySyncUtc,
} from "@/lib/economy/syncUtc";
import { extractCardAtSlot } from "@/lib/economy/extractCardAtSlot";
import {
  MARKET_LISTINGS_PAGE_SIZE,
  MARKET_MAX_ACTIVE_LISTINGS_PER_USER,
  MARKET_MAX_PRICE_COINS,
  MARKET_MIN_PRICE_COINS,
} from "@/lib/economy/marketConstants";
import { getPrisma } from "@/lib/db/prisma";
import {
  defaultState,
  hydrateStoredStateFromApi,
  normalizePullsCards,
} from "@/lib/storage/persist";
import { addCardsToSpareCopies } from "@/lib/storage/spareCopies";
import type { StoredState } from "@/lib/storage/types";
import type { SteamCard } from "@/lib/gacha/types";
import { randomUUID } from "node:crypto";

export type MarketListingDto = {
  id: string;
  sellerId: string;
  sellerLabel: string;
  priceCoins: number;
  card: SteamCard;
  createdAt: string;
};

function deserializePayload(raw: string | null | undefined): StoredState {
  if (!raw?.trim()) return defaultState();
  try {
    return hydrateStoredStateFromApi(JSON.parse(raw) as unknown);
  } catch {
    return defaultState();
  }
}

function serializeState(s: StoredState): string {
  return JSON.stringify(s);
}

function cloneState(s: StoredState): StoredState {
  return JSON.parse(JSON.stringify(s)) as StoredState;
}

function sanitizeState(s: StoredState): void {
  s.coins = Math.min(1_000_000_000, Math.max(0, Math.floor(s.coins)));
  s.dust = Math.min(1_000_000_000, Math.max(0, Math.floor(s.dust)));
  if (s.pulls.length > 10_000) {
    s.pulls = s.pulls.slice(-10_000);
  }
}

function sellerDisplayName(name: string | null, email: string): string {
  const n = name?.trim();
  if (n) return n;
  const e = email.trim();
  const at = e.indexOf("@");
  return at > 0 ? e.slice(0, at) : e;
}

export async function serverGetMarketListings(): Promise<{
  items: MarketListingDto[];
}> {
  const prisma = getPrisma();
  const rows = await prisma.marketListing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: MARKET_LISTINGS_PAGE_SIZE,
    include: {
      seller: { select: { name: true, email: true } },
    },
  });

  const items: MarketListingDto[] = [];
  for (const row of rows) {
    let card: SteamCard;
    try {
      const raw = JSON.parse(row.cardJson) as unknown;
      const one = raw as SteamCard;
      if (!one || typeof one !== "object" || typeof one.appid !== "number") {
        continue;
      }
      card = one;
    } catch {
      continue;
    }
    const normState: StoredState = {
      ...defaultState(),
      pulls: [{ id: "tmp", openedAt: new Date(0).toISOString(), cards: [card] }],
    };
    normalizePullsCards(normState);
    card = normState.pulls[0]!.cards[0]!;

    items.push({
      id: row.id,
      sellerId: row.sellerId,
      sellerLabel: sellerDisplayName(
        row.seller.name,
        row.seller.email ?? "",
      ),
      priceCoins: row.priceCoins,
      card,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return { items };
}

export type MarketCreateResult =
  | { ok: true; state: StoredState; listingId: string }
  | { ok: false; code: string; message?: string };

export async function serverCreateMarketListing(
  sellerId: string,
  pullId: string,
  slotIndex: number,
  priceCoins: number,
): Promise<MarketCreateResult> {
  const p = Math.floor(Number(priceCoins));
  if (!Number.isFinite(p) || p < MARKET_MIN_PRICE_COINS) {
    return { ok: false, code: "price_too_low" };
  }
  if (p > MARKET_MAX_PRICE_COINS) {
    return { ok: false, code: "price_too_high" };
  }

  try {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      const active = await tx.marketListing.count({
        where: { sellerId, status: "active" },
      });
      if (active >= MARKET_MAX_ACTIVE_LISTINGS_PER_USER) {
        return { ok: false, code: "too_many_listings" };
      }

      const row = await tx.gameSave.findUnique({ where: { userId: sellerId } });
      let state = deserializePayload(row?.payload);
      applyLoginStreakUtc(state);
      economySyncUtc(state);

      const ex = extractCardAtSlot(state, pullId.trim(), slotIndex);
      if (!ex.ok) {
        return { ok: false, code: ex.code };
      }

      const listing = await tx.marketListing.create({
        data: {
          sellerId,
          priceCoins: p,
          cardJson: JSON.stringify(ex.card),
          status: "active",
        },
      });

      syncAchievements(state);
      sanitizeState(state);
      await tx.gameSave.upsert({
        where: { userId: sellerId },
        create: { userId: sellerId, payload: serializeState(state) },
        update: { payload: serializeState(state) },
      });

      return {
        ok: true as const,
        state: cloneState(state),
        listingId: listing.id,
      };
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return { ok: false, code: "error", message };
  }
}

export type MarketCancelResult =
  | { ok: true; state: StoredState }
  | { ok: false; code: string };

export async function serverCancelMarketListing(
  sellerId: string,
  listingId: string,
): Promise<MarketCancelResult> {
  try {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.marketListing.findFirst({
        where: { id: listingId, sellerId, status: "active" },
      });
      if (!listing) {
        return { ok: false, code: "not_found" };
      }

      let card: SteamCard;
      try {
        card = JSON.parse(listing.cardJson) as SteamCard;
      } catch {
        return { ok: false, code: "bad_listing" };
      }

      const row = await tx.gameSave.findUnique({ where: { userId: sellerId } });
      let state = deserializePayload(row?.payload);
      applyLoginStreakUtc(state);
      economySyncUtc(state);

      state.pulls.push({
        id: randomUUID(),
        openedAt: new Date().toISOString(),
        cards: [card],
      });
      addCardsToSpareCopies(state, [card]);
      normalizePullsCards(state);

      await tx.marketListing.delete({ where: { id: listingId } });

      syncAchievements(state);
      sanitizeState(state);
      await tx.gameSave.upsert({
        where: { userId: sellerId },
        create: { userId: sellerId, payload: serializeState(state) },
        update: { payload: serializeState(state) },
      });

      return { ok: true as const, state: cloneState(state) };
    });
  } catch {
    return { ok: false, code: "error" };
  }
}

export type MarketBuyResult =
  | { ok: true; state: StoredState }
  | { ok: false; code: string; message?: string };

export async function serverBuyMarketListing(
  buyerId: string,
  listingId: string,
): Promise<MarketBuyResult> {
  try {
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.marketListing.findUnique({
        where: { id: listingId },
      });
      if (!listing || listing.status !== "active") {
        return { ok: false, code: "not_found" };
      }
      if (listing.sellerId === buyerId) {
        return { ok: false, code: "own_listing" };
      }

      const buyerRow = await tx.gameSave.findUnique({
        where: { userId: buyerId },
      });
      const sellerRow = await tx.gameSave.findUnique({
        where: { userId: listing.sellerId },
      });

      let buyer = deserializePayload(buyerRow?.payload);
      let seller = deserializePayload(sellerRow?.payload);
      applyLoginStreakUtc(buyer);
      applyLoginStreakUtc(seller);
      economySyncUtc(buyer);
      economySyncUtc(seller);

      if (buyer.coins < listing.priceCoins) {
        return { ok: false, code: "need_coins" };
      }

      const reserved = await tx.marketListing.updateMany({
        where: { id: listingId, status: "active" },
        data: {
          status: "sold",
          buyerId,
          soldAt: new Date(),
        },
      });
      if (reserved.count !== 1) {
        return { ok: false, code: "gone" };
      }

      let card: SteamCard;
      try {
        card = JSON.parse(listing.cardJson) as SteamCard;
      } catch {
        return { ok: false, code: "bad_listing" };
      }

      buyer.coins -= listing.priceCoins;
      seller.coins += listing.priceCoins;

      buyer.pulls.push({
        id: randomUUID(),
        openedAt: new Date().toISOString(),
        cards: [card],
      });
      addCardsToSpareCopies(buyer, [card]);
      normalizePullsCards(buyer);
      normalizePullsCards(seller);

      syncAchievements(buyer);
      syncAchievements(seller);
      sanitizeState(buyer);
      sanitizeState(seller);

      await tx.gameSave.upsert({
        where: { userId: buyerId },
        create: { userId: buyerId, payload: serializeState(buyer) },
        update: { payload: serializeState(buyer) },
      });
      await tx.gameSave.upsert({
        where: { userId: listing.sellerId },
        create: {
          userId: listing.sellerId,
          payload: serializeState(seller),
        },
        update: { payload: serializeState(seller) },
      });

      return { ok: true as const, state: cloneState(buyer) };
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "buy_failed";
    return { ok: false, code: "error", message };
  }
}

export async function serverGetMyActiveListings(
  sellerId: string,
): Promise<MarketListingDto[]> {
  const prisma = getPrisma();
  const rows = await prisma.marketListing.findMany({
    where: { sellerId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { name: true, email: true } },
    },
  });

  const items: MarketListingDto[] = [];
  for (const row of rows) {
    let card: SteamCard;
    try {
      const raw = JSON.parse(row.cardJson) as SteamCard;
      if (!raw || typeof raw.appid !== "number") continue;
      card = raw;
    } catch {
      continue;
    }
    const normState: StoredState = {
      ...defaultState(),
      pulls: [{ id: "tmp", openedAt: new Date(0).toISOString(), cards: [card] }],
    };
    normalizePullsCards(normState);
    card = normState.pulls[0]!.cards[0]!;

    items.push({
      id: row.id,
      sellerId: row.sellerId,
      sellerLabel: sellerDisplayName(
        row.seller.name,
        row.seller.email ?? "",
      ),
      priceCoins: row.priceCoins,
      card,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return items;
}
