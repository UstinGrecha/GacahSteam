import { describe, expect, it } from "vitest";
import type { AppMetrics } from "./types";
import {
  computeStrictRarity,
  rarityFromReviewMassOnly,
  rarityTierIndexFromReviews,
} from "./rarityStrict";

const ctxOk = { comingSoon: false, unreleasedLowReviews: false };

const template = (over: Partial<AppMetrics> = {}): AppMetrics => ({
  positivePercent: 88,
  hasUserReviews: true,
  metacritic: 85,
  priceFinalUsd: 29.99,
  reviewCount: 10_000,
  shortDescriptionLength: 600,
  releaseDateMs: Date.now() - 5 * 365.25 * 24 * 3600 * 1000,
  ...over,
});

describe("rarityFromReviewMassOnly / rarityTierIndexFromReviews", () => {
  it("steps by review count only", () => {
    expect(rarityFromReviewMassOnly(0)).toBe("common");
    expect(rarityFromReviewMassOnly(279)).toBe("common");
    expect(rarityFromReviewMassOnly(280)).toBe("uncommon");
    expect(rarityFromReviewMassOnly(7_000)).toBe("rare");
    expect(rarityFromReviewMassOnly(38_000)).toBe("epic");
    expect(rarityFromReviewMassOnly(125_000)).toBe("holo");
    expect(rarityFromReviewMassOnly(400_000)).toBe("legend");
    expect(rarityTierIndexFromReviews(38_000)).toBe(3);
  });
});

describe("computeStrictRarity", () => {
  it("forces common when coming soon", () => {
    expect(
      computeStrictRarity(template(), {
        comingSoon: true,
        unreleasedLowReviews: false,
      }),
    ).toBe("common");
  });

  it("forces common when unreleased with few reviews", () => {
    expect(
      computeStrictRarity(
        template({ reviewCount: 100 }),
        { comingSoon: false, unreleasedLowReviews: true },
      ),
    ).toBe("common");
  });

  it("mega-hit by reviews is legend (age does not lower)", () => {
    expect(
      computeStrictRarity(
        template({ reviewCount: 500_000 }),
        ctxOk,
      ),
    ).toBe("legend");
  });

  it("does not use positive % — bad reviews same tier as good at same mass+age", () => {
    const young = Date.now() - 2 * 365.25 * 24 * 3600 * 1000;
    const a = template({
      reviewCount: 50_000,
      positivePercent: 38,
      releaseDateMs: young,
    });
    const b = template({
      reviewCount: 50_000,
      positivePercent: 95,
      releaseDateMs: young,
    });
    expect(computeStrictRarity(a, ctxOk)).toBe(computeStrictRarity(b, ctxOk));
  });

  it("old catalog with mass gets +tier vs fresh release same reviews", () => {
    const rc = 8_000;
    const fresh = template({
      reviewCount: rc,
      releaseDateMs: Date.now() - 90 * 24 * 3600 * 1000,
    });
    const classic = template({
      reviewCount: rc,
      releaseDateMs: Date.now() - 6 * 365.25 * 24 * 3600 * 1000,
    });
    expect(rarityTierIndexFromReviews(rc)).toBe(2);
    expect(computeStrictRarity(fresh, ctxOk)).toBe("rare");
    expect(computeStrictRarity(classic, ctxOk)).toBe("epic");
  });

  it("very fresh + few reviews — tier not inflated", () => {
    const m = template({
      reviewCount: 120,
      releaseDateMs: Date.now() - 20 * 24 * 3600 * 1000,
    });
    expect(computeStrictRarity(m, ctxOk)).toBe("common");
  });
});
