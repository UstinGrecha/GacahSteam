import { describe, expect, it } from "vitest";
import type { AppMetrics } from "./types";
import {
  computeStrictRarity,
  rarityFromReviewMassOnly,
} from "./rarityStrict";

const ctxOk = { comingSoon: false, unreleasedLowReviews: false };

const goodGame: AppMetrics = {
  positivePercent: 88,
  hasUserReviews: true,
  metacritic: 85,
  priceFinalUsd: 29.99,
  reviewCount: 100_000,
  shortDescriptionLength: 600,
  releaseDateMs: Date.now() - 5 * 365.25 * 24 * 3600 * 1000,
};

describe("rarityFromReviewMassOnly", () => {
  it("steps strictly by review count", () => {
    expect(rarityFromReviewMassOnly(0)).toBe("common");
    expect(rarityFromReviewMassOnly(279)).toBe("common");
    expect(rarityFromReviewMassOnly(280)).toBe("uncommon");
    expect(rarityFromReviewMassOnly(6_999)).toBe("uncommon");
    expect(rarityFromReviewMassOnly(7_000)).toBe("rare");
    expect(rarityFromReviewMassOnly(37_999)).toBe("rare");
    expect(rarityFromReviewMassOnly(38_000)).toBe("epic");
    expect(rarityFromReviewMassOnly(124_999)).toBe("epic");
    expect(rarityFromReviewMassOnly(125_000)).toBe("holo");
    expect(rarityFromReviewMassOnly(399_999)).toBe("holo");
    expect(rarityFromReviewMassOnly(400_000)).toBe("legend");
  });
});

describe("computeStrictRarity", () => {
  it("forces common when coming soon", () => {
    expect(
      computeStrictRarity(goodGame, {
        comingSoon: true,
        unreleasedLowReviews: false,
      }),
    ).toBe("common");
  });

  it("forces common when unreleased with few reviews", () => {
    expect(
      computeStrictRarity(
        { ...goodGame, reviewCount: 100 },
        { comingSoon: false, unreleasedLowReviews: true },
      ),
    ).toBe("common");
  });

  it("mega-hit with good sentiment is legend", () => {
    expect(
      computeStrictRarity(
        { ...goodGame, reviewCount: 500_000, positivePercent: 92 },
        ctxOk,
      ),
    ).toBe("legend");
  });

  it("caps mass tier when Steam reviews are very negative", () => {
    const massEpic = rarityFromReviewMassOnly(50_000);
    expect(massEpic).toBe("epic");
    expect(
      computeStrictRarity(
        {
          ...goodGame,
          reviewCount: 50_000,
          positivePercent: 38,
          hasUserReviews: true,
        },
        ctxOk,
      ),
    ).toBe("uncommon");
  });

  it("uses metacritic ceiling when no user review percent", () => {
    expect(
      computeStrictRarity(
        {
          ...goodGame,
          hasUserReviews: false,
          reviewCount: 0,
          positivePercent: 0,
          metacritic: 40,
        },
        ctxOk,
      ),
    ).toBe("common");
  });
});
