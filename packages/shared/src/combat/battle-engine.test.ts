import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { simulateBattle, getCombatElementalMultiplier } from "./battle-engine.js";
import type { CombatFighter } from "../schemas/combat.js";
import { ELEMENT_KEYS, type ElementKey } from "../config/elements.js";

describe("Turn-based Combat Engine & Battle Simulation (T6.1)", () => {
  it("correctly calculates elemental counter multipliers", () => {
    // Metal counters Wood (+30%)
    expect(getCombatElementalMultiplier("metal", "wood")).toBe(1.3);
    // Wood is countered by Metal (-25%)
    expect(getCombatElementalMultiplier("wood", "metal")).toBe(0.75);
    // Same element = 1.0
    expect(getCombatElementalMultiplier("fire", "fire")).toBe(1.0);
    // Light vs Dark polar clash = 1.25
    expect(getCombatElementalMultiplier("light", "dark")).toBe(1.25);
    expect(getCombatElementalMultiplier("dark", "light")).toBe(1.25);
  });

  it("produces deterministic battle outcomes for the exact same seed", () => {
    const fighterA: CombatFighter = {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Chien Binh Kim",
      primaryElement: "metal",
      stats: { qi: 40, guard: 30, agility: 25, harmony: 20, chaos: 15 },
      currentHp: 550,
      maxHp: 550,
    };
    const fighterB: CombatFighter = {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Linh Thu Moc",
      primaryElement: "wood",
      stats: { qi: 35, guard: 20, agility: 30, harmony: 25, chaos: 10 },
      currentHp: 450,
      maxHp: 450,
    };

    const res1 = simulateBattle([fighterA], [fighterB], 12345);
    const res2 = simulateBattle([fighterA], [fighterB], 12345);

    expect(res1.winnerSide).toBe(res2.winnerSide);
    expect(res1.totalRounds).toBe(res2.totalRounds);
    expect(res1.rounds.length).toBe(res2.rounds.length);
    expect(res1.rounds[0]?.damageDealt).toBe(res2.rounds[0]?.damageDealt);
  });

  it("awards assimilated gene strain when attacker claims victory", () => {
    // Overpowered attacker vs fragile defender
    const strongAttacker: CombatFighter = {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Ba Vuong",
      primaryElement: "fire",
      stats: { qi: 90, guard: 80, agility: 90, harmony: 50, chaos: 30 },
      currentHp: 1300,
      maxHp: 1300,
    };
    const weakDefender: CombatFighter = {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Tieu Yeu",
      primaryElement: "wood",
      stats: { qi: 10, guard: 5, agility: 10, harmony: 10, chaos: 5 },
      currentHp: 125,
      maxHp: 125,
    };

    const result = simulateBattle([strongAttacker], [weakDefender], 999);
    expect(result.winnerSide).toBe("attacker");
    expect(result.assimilatedGene).not.toBeNull();
    expect(result.assimilatedGene?.element).toBe("wood");
  });

  it("PROPERTY TEST: Battles always terminate within 50 rounds and never produce negative HP", () => {
    const fighterArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 2, maxLength: 20 }),
      primaryElement: fc.constantFrom(...ELEMENT_KEYS) as fc.Arbitrary<ElementKey>,
      stats: fc.record({
        qi: fc.integer({ min: 5, max: 100 }),
        guard: fc.integer({ min: 5, max: 100 }),
        agility: fc.integer({ min: 5, max: 100 }),
        harmony: fc.integer({ min: 5, max: 100 }),
        chaos: fc.integer({ min: 1, max: 50 }),
      }),
      currentHp: fc.integer({ min: 50, max: 1500 }),
      maxHp: fc.integer({ min: 50, max: 1500 }),
    }) as fc.Arbitrary<CombatFighter>;

    fc.assert(
      fc.property(
        fc.array(fighterArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(fighterArbitrary, { minLength: 1, maxLength: 3 }),
        fc.integer(),
        (teamA, teamB, seed) => {
          const res = simulateBattle(teamA, teamB, seed);

          // 1. Invariant: Max 50 rounds
          expect(res.totalRounds).toBeLessThanOrEqual(50);

          // 2. Invariant: Valid winner
          expect(["attacker", "defender", "draw"]).toContain(res.winnerSide);

          // 3. Invariant: Remaining HP non-negative
          expect(res.attackerRemainingHp).toBeGreaterThanOrEqual(0);
          expect(res.defenderRemainingHp).toBeGreaterThanOrEqual(0);

          // 4. Invariant: Every log entry has non-negative target HP
          for (const round of res.rounds) {
            expect(round.damageDealt).toBeGreaterThanOrEqual(1);
            expect(round.targetRemainingHp).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
