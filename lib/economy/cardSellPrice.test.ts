import type { Rarity, SteamCard } from "@/lib/gacha/types";
import { describe, expect, it } from "vitest";
import { cardSellCoins } from "./cardSellPrice";

function card(rarity: Rarity, atk: number, def: number, hp: number): SteamCard {
  return {
    appid: 1,
    name: "Test",
    headerImage: "",
    storeUrl: "",
    rarity,
    atk,
    def,
    hp,
    score: 50,
    positivePercent: 80,
    metacritic: null,
    hasUserReviews: true,
    reviewCount: 100,
    releaseDateMs: null,
    genres: [],
    reviewScoreDesc: null,
    traits: [],
  };
}

describe("cardSellCoins", () => {
  it("is higher for legend than common at same stats", () => {
    const c = card("common", 10, 10, 10);
    const l = card("legend", 10, 10, 10);
    expect(cardSellCoins(l)).toBeGreaterThan(cardSellCoins(c));
  });

  it("is higher for champion than legend at same stats", () => {
    const l = card("legend", 10, 10, 10);
    const u = card("champion", 10, 10, 10);
    expect(cardSellCoins(u)).toBeGreaterThan(cardSellCoins(l));
  });

  it("increases with combat sum", () => {
    const low = card("rare", 1, 1, 1);
    const high = card("rare", 50, 50, 50);
    expect(cardSellCoins(high)).toBeGreaterThan(cardSellCoins(low));
  });

  it("clamps to at least 1", () => {
    expect(cardSellCoins(card("common", 0, 0, 0))).toBeGreaterThanOrEqual(1);
  });
});
