import { describe, it, expect } from "vitest";
import { BASE_SPECIES, SPECIES_BY_KEY } from "./species.js";
import { BASE_ITEMS, ITEMS_BY_KEY } from "./items.js";
import { clampStats, ItemGenomeSchema } from "../schemas/genome.js";
import { ELEMENT_KEYS } from "./elements.js";

describe("Species and Items Definitions (T2.1)", () => {
  it("contains exactly 10 base species across the 5 core elements", () => {
    expect(BASE_SPECIES).toHaveLength(10);
    expect(Object.keys(SPECIES_BY_KEY)).toHaveLength(10);

    for (const species of BASE_SPECIES) {
      expect(ELEMENT_KEYS).toContain(species.element);
      expect(species.stage).toBeGreaterThanOrEqual(1);
      expect(species.nameVi.length).toBeGreaterThan(0);
      expect(species.nameEn.length).toBeGreaterThan(0);

      // Verify all base stats within [1..100]
      expect(species.baseStats.qi).toBeGreaterThanOrEqual(1);
      expect(species.baseStats.qi).toBeLessThanOrEqual(100);
      expect(species.baseStats.guard).toBeGreaterThanOrEqual(1);
      expect(species.baseStats.guard).toBeLessThanOrEqual(100);
      expect(species.baseStats.agility).toBeGreaterThanOrEqual(1);
      expect(species.baseStats.agility).toBeLessThanOrEqual(100);
      expect(species.baseStats.harmony).toBeGreaterThanOrEqual(1);
      expect(species.baseStats.harmony).toBeLessThanOrEqual(100);
      expect(species.baseStats.chaos).toBeGreaterThanOrEqual(1);
      expect(species.baseStats.chaos).toBeLessThanOrEqual(100);

      expect(species.defaultTraits.length).toBeLessThanOrEqual(3);
    }
  });

  it("contains exactly 15 base items spanning raw, compound, and legendary categories", () => {
    expect(BASE_ITEMS).toHaveLength(15);
    expect(Object.keys(ITEMS_BY_KEY)).toHaveLength(15);

    const rawItems = BASE_ITEMS.filter((i) => i.category === "raw");
    const compoundItems = BASE_ITEMS.filter((i) => i.category === "compound");
    const legendaryItems = BASE_ITEMS.filter((i) => i.category === "legendary");

    expect(rawItems).toHaveLength(8);
    expect(compoundItems).toHaveLength(5);
    expect(legendaryItems).toHaveLength(2);

    for (const item of BASE_ITEMS) {
      expect(ELEMENT_KEYS).toContain(item.element);
      if (item.secondaryElement) {
        expect(ELEMENT_KEYS).toContain(item.secondaryElement);
      }
      expect(item.rarity).toBeGreaterThanOrEqual(1);
      expect(item.rarity).toBeLessThanOrEqual(5);
    }
  });

  it("clamps out-of-bound stats strictly within [1..100]", () => {
    const raw = {
      qi: -10,
      guard: 0,
      agility: 50.4,
      harmony: 100,
      chaos: 150,
    };
    const clamped = clampStats(raw);
    expect(clamped).toEqual({
      qi: 1,
      guard: 1,
      agility: 50,
      harmony: 100,
      chaos: 100,
    });
  });

  it("validates ItemGenomeSchema for crafted materials", () => {
    const validItemGenome = {
      primary: "metal",
      secondary: "fire",
      stats: { qi: 25, guard: 40, agility: 15, harmony: 20, chaos: 10 },
      traits: ["tempered"],
    };
    const result = ItemGenomeSchema.safeParse(validItemGenome);
    expect(result.success).toBe(true);
  });
});
