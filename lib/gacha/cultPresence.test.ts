import { describe, expect, it } from "vitest";
import type { AppMetrics } from "./types";
import {
  applyCultReviewMassFloors,
  computeCultPresenceScore,
  finalizeCultScore,
} from "./cultPresence";
import { computeScore, scoreToRarity } from "./stats";

const base: AppMetrics = {
  positivePercent: 88,
  hasUserReviews: true,
  metacritic: 85,
  priceFinalUsd: 29.99,
  reviewCount: 100_000,
  shortDescriptionLength: 600,
  releaseDateMs: Date.now() - 5 * 365.25 * 24 * 3600 * 1000,
};

describe("applyCultReviewMassFloors", () => {
  it("raises ~51k reviews to at least epic tier score", () => {
    const s = applyCultReviewMassFloors(30, 51_000);
    expect(s).toBeGreaterThanOrEqual(74);
    expect(scoreToRarity(s)).toBe("epic");
  });

  it("raises mega hits to legend-tier score", () => {
    const s = applyCultReviewMassFloors(40, 500_000);
    expect(s).toBeGreaterThanOrEqual(91);
    expect(scoreToRarity(s)).toBe("legend");
  });
});

describe("finalizeCultScore", () => {
  it("matches computeScore with zero bonus", () => {
    expect(finalizeCultScore(base, 0)).toBe(computeScore(base));
  });
});
