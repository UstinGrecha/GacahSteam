import { describe, expect, it } from "vitest";
import type { AppMetrics } from "./types";
import {
  clamp,
  computeAtkDef,
  computeCardHp,
  computeCombatStats,
  computeScore,
  combatResistValue,
  combatRetreatCost,
  combatWeaknessMultiplier,
  scoreToRarity,
} from "./stats";

const base: AppMetrics = {
  positivePercent: 85,
  hasUserReviews: true,
  metacritic: 88,
  priceFinalUsd: 39.99,
  reviewCount: 120_000,
  shortDescriptionLength: 800,
  releaseDateMs: Date.now() - 4 * 365.25 * 24 * 3600 * 1000,
};

describe("computeScore", () => {
  it("returns finite number in 0–100", () => {
    const s = computeScore(base);
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it("handles missing metacritic", () => {
    const s = computeScore({ ...base, metacritic: null });
    expect(Number.isFinite(s)).toBe(true);
  });

  it("handles no user reviews signal", () => {
    const s = computeScore({ ...base, hasUserReviews: false, positivePercent: 0 });
    expect(Number.isFinite(s)).toBe(true);
  });

  it("handles zero reviews", () => {
    const s = computeScore({ ...base, reviewCount: 0 });
    expect(Number.isFinite(s)).toBe(true);
  });

  it("raises score with higher metacritic when review mass is tiny", () => {
    const lowMc = computeScore({
      ...base,
      positivePercent: 72,
      metacritic: 38,
      reviewCount: 6,
    });
    const highMc = computeScore({
      ...base,
      positivePercent: 72,
      metacritic: 94,
      reviewCount: 6,
    });
    expect(highMc).toBeGreaterThan(lowMc);
  });

  it("ignores review term when hasUserReviews is false", () => {
    const withFakePct = computeScore({
      ...base,
      hasUserReviews: false,
      positivePercent: 99,
      metacritic: null,
      reviewCount: 0,
    });
    const withZeroPct = computeScore({
      ...base,
      hasUserReviews: false,
      positivePercent: 0,
      metacritic: null,
      reviewCount: 0,
    });
    expect(withFakePct).toBe(withZeroPct);
  });

  it("keeps ~51k+ review games in super-rare score band", () => {
    const s = computeScore({ ...base, reviewCount: 51_000 });
    expect(s).toBeGreaterThanOrEqual(74);
  });

  it("boosts score for older releases when review mass is similar", () => {
    const young = {
      ...base,
      reviewCount: 4_000,
      releaseDateMs: Date.now() - 0.45 * 365.25 * 24 * 3600 * 1000,
    };
    const old = {
      ...base,
      reviewCount: 4_000,
      releaseDateMs: Date.now() - 12 * 365.25 * 24 * 3600 * 1000,
    };
    expect(computeScore(old)).toBeGreaterThan(computeScore(young));
  });

  it("for same age, more reviews yield higher score", () => {
    const rel = Date.now() - 10 * 365.25 * 24 * 3600 * 1000;
    const few = { ...base, reviewCount: 900, releaseDateMs: rel };
    const many = { ...base, reviewCount: 350_000, releaseDateMs: rel };
    expect(computeScore(many)).toBeGreaterThan(computeScore(few));
  });

  it("more review mass at same age scores higher", () => {
    const rel = Date.now() - 8 * 365.25 * 24 * 3600 * 1000;
    const small = { ...base, reviewCount: 200, releaseDateMs: rel };
    const huge = { ...base, reviewCount: 400_000, releaseDateMs: rel };
    expect(computeScore(huge)).toBeGreaterThan(computeScore(small));
  });
});

describe("scoreToRarity", () => {
  it("maps thresholds", () => {
    expect(scoreToRarity(20)).toBe("common");
    expect(scoreToRarity(44)).toBe("common");
    expect(scoreToRarity(45)).toBe("uncommon");
    expect(scoreToRarity(50)).toBe("uncommon");
    expect(scoreToRarity(60)).toBe("rare");
    expect(scoreToRarity(76)).toBe("epic");
    expect(scoreToRarity(79)).toBe("epic");
    expect(scoreToRarity(80)).toBe("holo");
    expect(scoreToRarity(85)).toBe("holo");
    expect(scoreToRarity(87)).toBe("holo");
    expect(scoreToRarity(88)).toBe("legend");
    expect(scoreToRarity(90)).toBe("legend");
  });
});

describe("computeAtkDef", () => {
  it("produces bounded integers without NaN", () => {
    const score = computeScore(base);
    const { atk, def } = computeAtkDef(score, base);
    expect(Number.isInteger(atk)).toBe(true);
    expect(Number.isInteger(def)).toBe(true);
    expect(Number.isNaN(atk)).toBe(false);
    expect(Number.isNaN(def)).toBe(false);
    expect(atk).toBeGreaterThanOrEqual(10);
    expect(atk).toBeLessThanOrEqual(150);
    expect(def).toBeGreaterThanOrEqual(10);
    expect(def).toBeLessThanOrEqual(150);
  });
});

describe("computeCombatStats", () => {
  it("raises atk, def, hp with rarity for same Steam metrics", () => {
    const score = 70;
    const c = computeCombatStats(score, base, "common");
    const l = computeCombatStats(score, base, "legend");
    expect(l.atk).toBeGreaterThan(c.atk);
    expect(l.def).toBeGreaterThan(c.def);
    expect(l.hp).toBeGreaterThan(c.hp);
    expect(l.hp).toBe(computeCardHp(l.atk, l.def, score));
  });

  it("holo sits between epic and legend for combat bonuses", () => {
    const score = 75;
    const e = computeCombatStats(score, base, "epic");
    const h = computeCombatStats(score, base, "holo");
    const l = computeCombatStats(score, base, "legend");
    expect(h.atk).toBeGreaterThan(e.atk);
    expect(h.atk).toBeLessThan(l.atk);
    expect(h.def).toBeGreaterThan(e.def);
    expect(h.def).toBeLessThan(l.def);
  });

  it("weakness multiplier never decreases below epic vs rare", () => {
    expect(combatWeaknessMultiplier("legend")).toBeGreaterThanOrEqual(
      combatWeaknessMultiplier("rare"),
    );
    expect(combatRetreatCost("legend")).toBeGreaterThanOrEqual(
      combatRetreatCost("common"),
    );
  });

  it("resist scales with def and rarity", () => {
    expect(combatResistValue(100, "legend")).toBeGreaterThan(
      combatResistValue(50, "common"),
    );
  });
});

describe("clamp", () => {
  it("clamps", () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(15, 10, 20)).toBe(15);
    expect(clamp(25, 10, 20)).toBe(20);
  });
});
