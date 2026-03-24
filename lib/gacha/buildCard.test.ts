import { describe, expect, it } from "vitest";
import type { SteamAppDetailsData } from "@/lib/steam/types";
import { buildSteamCard } from "./buildCard";

function skeleton(over: Partial<SteamAppDetailsData>): SteamAppDetailsData {
  return {
    type: "game",
    name: "Test Game",
    header_image: "https://example.com/h.jpg",
    short_description: "x".repeat(400),
    ...over,
  };
}

describe("buildSteamCard rarity guards", () => {
  it("forces common for coming_soon even with huge review count", () => {
    const c = buildSteamCard(
      1,
      skeleton({
        release_date: { coming_soon: true, date: "1 Jan, 2027" },
        recommendations: { total: 80_000 },
        reviews: "Very Positive (96% of 80,000 reviews)",
        review_score: 9,
        metacritic: { score: 90 },
      }),
    );
    expect(c?.rarity).toBe("common");
  });

  it("mid-size cult hit is at least rare, not common", () => {
    const c = buildSteamCard(
      2,
      skeleton({
        release_date: { coming_soon: false, date: "15 Mar, 2019" },
        recommendations: { total: 10_000 },
        reviews: "Very Positive (90% of 10,000 reviews)",
        review_score: 8,
        metacritic: { score: 82 },
      }),
    );
    expect(c).not.toBeNull();
    expect(["common", "uncommon"]).not.toContain(c!.rarity);
  });
});
