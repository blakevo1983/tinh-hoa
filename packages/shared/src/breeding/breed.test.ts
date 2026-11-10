import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { breed, getElementRelation, type BreedParent } from "./breed.js";
import { seededRng } from "../types/rng.js";
import { createFakeClock } from "../types/clock.js";
import { ELEMENT_KEYS } from "../config/elements.js";
import type { Stats } from "../schemas/element.js";

describe("Breeding System (Pure Function T2.2)", () => {
  it("determines correct elemental relationships according to GDD 7", () => {
    // Same element
    expect(getElementRelation("metal", "metal")).toBe("same");
    expect(getElementRelation("fire", "fire")).toBe("same");

    // Polar opposite
    expect(getElementRelation("light", "dark")).toBe("polar");
    expect(getElementRelation("dark", "light")).toBe("polar");

    // Generative (Tương sinh)
    expect(getElementRelation("metal", "water")).toBe("generative");
    expect(getElementRelation("water", "wood")).toBe("generative");
    expect(getElementRelation("wood", "fire")).toBe("generative");
    expect(getElementRelation("fire", "earth")).toBe("generative");
    expect(getElementRelation("earth", "metal")).toBe("generative");

    // Destructive (Tương khắc)
    expect(getElementRelation("metal", "wood")).toBe("destructive");
    expect(getElementRelation("wood", "earth")).toBe("destructive");
    expect(getElementRelation("earth", "water")).toBe("destructive");
    expect(getElementRelation("water", "fire")).toBe("destructive");
    expect(getElementRelation("fire", "metal")).toBe("destructive");

    // Neutral
    expect(getElementRelation("metal", "light")).toBe("neutral");
  });

  it("is 100% deterministic given the same seed, clock, and parents", () => {
    const parentA: BreedParent = {
      id: "parent-a-1",
      speciesKey: "verdant_sprout",
      genome: {
        primary: "wood",
        secondary: null,
        stats: { qi: 40, guard: 30, agility: 25, harmony: 50, chaos: 10 },
        traits: ["photosynthesis"],
        generation: 1,
        inbreeding: 0,
      },
    };

    const parentB: BreedParent = {
      id: "parent-b-1",
      speciesKey: "aqua_slime",
      genome: {
        primary: "water",
        secondary: null,
        stats: { qi: 35, guard: 20, agility: 40, harmony: 45, chaos: 12 },
        traits: ["fluid_form"],
        generation: 1,
        inbreeding: 0,
      },
    };

    const clock = createFakeClock(1700000000000);
    const rng1 = seededRng("deterministic-breed-seed-42");
    const rng2 = seededRng("deterministic-breed-seed-42");

    const result1 = breed({
      parentA,
      parentB,
      rng: rng1,
      clock,
      planetId: "planet-1",
    });

    const result2 = breed({
      parentA,
      parentB,
      rng: rng2,
      clock,
      planetId: "planet-1",
    });

    expect(result1).toEqual(result2);
  });

  it("catalyst influences primary element orientation", () => {
    const parentA: BreedParent = {
      id: "parent-a-2",
      speciesKey: "ember_wisp",
      genome: {
        primary: "fire",
        secondary: null,
        stats: { qi: 50, guard: 20, agility: 30, harmony: 20, chaos: 15 },
        traits: ["blazing_spark"],
        generation: 1,
        inbreeding: 0,
      },
    };

    const parentB: BreedParent = {
      id: "parent-b-2",
      speciesKey: "stone_pangolin",
      genome: {
        primary: "earth",
        secondary: null,
        stats: { qi: 30, guard: 50, agility: 15, harmony: 30, chaos: 10 },
        traits: ["earth_curl"],
        generation: 1,
        inbreeding: 0,
      },
    };

    const clock = createFakeClock(1000);
    let metalCatalyzedCount = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      const rng = seededRng(`catalyst-trial-${i}`);
      const res = breed({
        parentA,
        parentB,
        catalyst: { itemKey: "iron_ore", element: "metal" },
        rng,
        clock,
        planetId: "p1",
      });
      if (res.childGenome.primary === "metal") {
        metalCatalyzedCount++;
      }
    }

    // Catalyst should succeed ~70% of the time
    expect(metalCatalyzedCount).toBeGreaterThan(50);
  });

  it("penalizes inbreeding across 20 successive brother-sister generations without explosive stat growth", () => {
    let currentParentA: BreedParent = {
      id: "gen-0-a",
      speciesKey: "metal_golem",
      genome: {
        primary: "metal",
        secondary: null,
        stats: { qi: 30, guard: 40, agility: 20, harmony: 25, chaos: 10 },
        traits: ["iron_skin"],
        generation: 1,
        inbreeding: 0,
      },
    };

    let currentParentB: BreedParent = {
      id: "gen-0-b",
      speciesKey: "metal_golem",
      genome: {
        primary: "metal",
        secondary: null,
        stats: { qi: 32, guard: 38, agility: 22, harmony: 24, chaos: 8 },
        traits: ["sharp_horn"],
        generation: 1,
        inbreeding: 0,
      },
    };

    const clock = createFakeClock(1000);
    const rng = seededRng("inbreeding-chain-20-gens");

    for (let gen = 1; gen <= 20; gen++) {
      const breedRes = breed({
        parentA: currentParentA,
        parentB: currentParentB,
        rng,
        clock,
        planetId: "planet-inbreeding",
      });

      const child = breedRes.childGenome;
      // Invariants across all generations
      expect(child.stats.qi).toBeGreaterThanOrEqual(1);
      expect(child.stats.qi).toBeLessThanOrEqual(100);
      expect(child.stats.guard).toBeGreaterThanOrEqual(1);
      expect(child.stats.guard).toBeLessThanOrEqual(100);
      expect(child.stats.agility).toBeGreaterThanOrEqual(1);
      expect(child.stats.agility).toBeLessThanOrEqual(100);
      expect(child.stats.harmony).toBeGreaterThanOrEqual(1);
      expect(child.stats.harmony).toBeLessThanOrEqual(100);
      expect(child.stats.chaos).toBeGreaterThanOrEqual(1);
      expect(child.stats.chaos).toBeLessThanOrEqual(100);

      expect(child.generation).toBe(gen + 1);
      expect(child.inbreeding).toBeGreaterThan(0);

      // Create siblings for next inbreeding cycle
      currentParentA = {
        id: `gen-${gen}-child-a`,
        speciesKey: breedRes.childSpeciesKey,
        genome: child,
        parentAId: currentParentA.id,
        parentBId: currentParentB.id,
      };
      currentParentB = {
        id: `gen-${gen}-child-b`,
        speciesKey: breedRes.childSpeciesKey,
        genome: {
          ...child,
          stats: { ...child.stats },
        },
        parentAId: currentParentA.id,
        parentBId: currentParentB.id,
      };
    }

    // After 20 generations of pure incest, inbreeding level must be high
    expect(currentParentA.genome.inbreeding).toBeGreaterThanOrEqual(15);
  });

  it("satisfies all property-based invariants with fast-check (100 runs)", () => {
    const statsArbitrary = fc.record({
      qi: fc.integer({ min: 1, max: 100 }),
      guard: fc.integer({ min: 1, max: 100 }),
      agility: fc.integer({ min: 1, max: 100 }),
      harmony: fc.integer({ min: 1, max: 100 }),
      chaos: fc.integer({ min: 1, max: 100 }),
    }) as fc.Arbitrary<Stats>;

    const elementArbitrary = fc.constantFrom(...ELEMENT_KEYS);

    const parentArbitrary = fc.record({
      id: fc.uuid(),
      speciesKey: fc.constantFrom(
        "metal_golem",
        "verdant_sprout",
        "aqua_slime",
        "ember_wisp",
        "stone_pangolin",
      ),
      genome: fc.record({
        primary: elementArbitrary,
        secondary: fc.oneof(fc.constant(null), elementArbitrary),
        stats: statsArbitrary,
        traits: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
        generation: fc.integer({ min: 1, max: 50 }),
        inbreeding: fc.integer({ min: 0, max: 20 }),
      }),
    });

    fc.assert(
      fc.property(
        parentArbitrary,
        parentArbitrary,
        fc.integer({ min: 1, max: 1000000 }),
        (pA, pB, seedVal) => {
          const rng = seededRng(`fc-seed-${seedVal}`);
          const clock = createFakeClock(1000);
          const result = breed({
            parentA: pA,
            parentB: pB,
            rng,
            clock,
            planetId: "planet-fc",
          });

          const { childGenome, effects, hatchDurationSec } = result;

          // 1. Stats boundaries
          expect(childGenome.stats.qi).toBeGreaterThanOrEqual(1);
          expect(childGenome.stats.qi).toBeLessThanOrEqual(100);
          expect(Number.isInteger(childGenome.stats.qi)).toBe(true);

          expect(childGenome.stats.guard).toBeGreaterThanOrEqual(1);
          expect(childGenome.stats.guard).toBeLessThanOrEqual(100);

          expect(childGenome.stats.agility).toBeGreaterThanOrEqual(1);
          expect(childGenome.stats.agility).toBeLessThanOrEqual(100);

          expect(childGenome.stats.harmony).toBeGreaterThanOrEqual(1);
          expect(childGenome.stats.harmony).toBeLessThanOrEqual(100);

          expect(childGenome.stats.chaos).toBeGreaterThanOrEqual(1);
          expect(childGenome.stats.chaos).toBeLessThanOrEqual(100);

          // 2. Traits <= 3
          expect(childGenome.traits.length).toBeLessThanOrEqual(3);

          // 3. Hatch duration and effects structure
          expect(hatchDurationSec).toBeGreaterThanOrEqual(60);
          expect(effects.length).toBeGreaterThanOrEqual(2);
          const jobEffect = effects.find((e) => e.type === "create_job");
          expect(jobEffect).toBeDefined();
          expect(jobEffect?.kind).toBe("breed");
        },
      ),
      { numRuns: 100 },
    );
  });
});
