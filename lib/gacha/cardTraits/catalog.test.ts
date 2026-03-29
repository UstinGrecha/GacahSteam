import { describe, expect, it } from "vitest";
import { CARD_TRAIT_CATALOG, CARD_TRAIT_COUNT, getCardTraitDef } from "./catalog";

describe("CARD_TRAIT_CATALOG", () => {
  it("has exactly 100 unique ids", () => {
    expect(CARD_TRAIT_COUNT).toBe(100);
    expect(CARD_TRAIT_CATALOG.length).toBe(100);
    const ids = new Set(CARD_TRAIT_CATALOG.map((t) => t.id));
    expect(ids.size).toBe(100);
  });

  it("lookups round-trip", () => {
    expect(getCardTraitDef("t001")?.name).toBe("Вампиризм");
    expect(getCardTraitDef("t100")?.name).toBe("Джекпот");
    expect(getCardTraitDef("bad")).toBeUndefined();
  });

  it("templates use {p} placeholder", () => {
    for (const t of CARD_TRAIT_CATALOG) {
      expect(t.effectTemplate.includes("{p}")).toBe(true);
    }
  });
});
