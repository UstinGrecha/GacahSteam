import { describe, expect, it } from "vitest";
import {
  hasSteamUserReviewSignal,
  isSteamAppReleased,
  parseSteamUserReviewCount,
  parseUserReviewPercent,
  steamDataToMetrics,
} from "./parse";
import type { SteamAppDetailsData } from "./types";

describe("parseUserReviewPercent", () => {
  it("parses percent from reviews text", () => {
    const d: SteamAppDetailsData = {
      reviews: "Very Positive (94% of 1200 reviews)",
    };
    expect(parseUserReviewPercent(d)).toBe(94);
  });

  it("maps review_score only when review count is known", () => {
    const noCount: SteamAppDetailsData = { review_score: 8 };
    expect(parseUserReviewPercent(noCount)).toBeNull();
    const d: SteamAppDetailsData = {
      review_score: 8,
      recommendations: { total: 40 },
    };
    expect(parseUserReviewPercent(d)).toBe(89);
  });

  it("returns null without signals", () => {
    const d: SteamAppDetailsData = {};
    expect(parseUserReviewPercent(d)).toBeNull();
  });
});

describe("hasSteamUserReviewSignal", () => {
  it("is true when recommendations.total > 0", () => {
    expect(
      hasSteamUserReviewSignal({
        recommendations: { total: 42 },
      }),
    ).toBe(true);
  });

  it("is false when empty", () => {
    expect(hasSteamUserReviewSignal({})).toBe(false);
  });

  it("is false when only review_score without count", () => {
    expect(hasSteamUserReviewSignal({ review_score: 8 })).toBe(false);
  });

  it("is true when reviews text includes count without recommendations", () => {
    expect(
      hasSteamUserReviewSignal({
        reviews: "Very Positive (94% of 1,200 reviews)",
      }),
    ).toBe(true);
  });
});

describe("parseSteamUserReviewCount", () => {
  it("parses count from reviews blurb", () => {
    expect(
      parseSteamUserReviewCount({
        reviews: "Mixed (55% of 88 reviews)",
      }),
    ).toBe(88);
  });

  it("parses parenthetical count without of", () => {
    expect(
      parseSteamUserReviewCount({
        reviews: "Mixed (10 reviews)",
      }),
    ).toBe(10);
  });

  it("coerces string recommendations.total", () => {
    expect(
      parseSteamUserReviewCount({
        recommendations: { total: "1500" },
      }),
    ).toBe(1500);
  });

  it("parses Steam HTML when recommendations missing (of the N user reviews)", () => {
    expect(
      parseSteamUserReviewCount({
        reviews:
          '<span>Very Positive</span><br>95% of the 61,234 user reviews for this game are positive.',
      }),
    ).toBe(61_234);
  });

  it("prefers largest count when multiple numbers appear", () => {
    expect(
      parseSteamUserReviewCount({
        reviews: "Note: 12 reviews; 45,000 reviews overall on Steam",
      }),
    ).toBe(45_000);
  });
});

describe("isSteamAppReleased", () => {
  it("is false when coming_soon", () => {
    expect(
      isSteamAppReleased({
        release_date: { coming_soon: true, date: "2026" },
      }),
    ).toBe(false);
  });

  it("is false when release date is in the future", () => {
    expect(
      isSteamAppReleased({
        release_date: { coming_soon: false, date: "Dec 31, 2038" },
      }),
    ).toBe(false);
  });
});

describe("steamDataToMetrics", () => {
  it("hasUserReviews false yields zero percent", () => {
    const m = steamDataToMetrics({});
    expect(m.hasUserReviews).toBe(false);
    expect(m.positivePercent).toBe(0);
    expect(m.reviewCount).toBe(0);
  });
});
