import { describe, it, expect } from "vitest";
import { calculateNpcExchangeRate, calculateNpcTradeOutput } from "./npc-trade.js";
import { ELEMENT_KEYS } from "../config/elements.js";
import type { NpcPlanetPersonality } from "../schemas/expedition.js";

const PERSONALITIES: readonly NpcPlanetPersonality[] = [
  "aggressive",
  "mercantile",
  "reclusive",
  "scientific",
];

describe("NPC Trade Economics & Anti-Arbitrage Invariants (T5.5)", () => {
  it("returns base rate 1.0 when trading the exact same element", () => {
    const res = calculateNpcExchangeRate("metal", "metal", "mercantile", "metal");
    expect(res.effectiveRate).toBe(1.0);
  });

  it("applies 12% commission for mercantile NPCs and 15% for others", () => {
    const merc = calculateNpcExchangeRate("fire", "water", "mercantile", "thunder");
    const nonMerc = calculateNpcExchangeRate("fire", "water", "scientific", "thunder");

    expect(merc.baseSpread).toBe(0.88);
    expect(nonMerc.baseSpread).toBe(0.85);
    expect(merc.effectiveRate).toBeGreaterThan(nonMerc.effectiveRate);
  });

  it("penalizes native element offering and rewards generative element offering", () => {
    // Water generates Wood
    const generous = calculateNpcExchangeRate("water", "fire", "mercantile", "wood");
    // Native Wood offering to Wood NPC
    const penalized = calculateNpcExchangeRate("wood", "fire", "mercantile", "wood");

    expect(generous.elementalAffinityMultiplier).toBe(1.1);
    expect(penalized.elementalAffinityMultiplier).toBe(0.9);
    expect(generous.effectiveRate).toBeGreaterThan(penalized.effectiveRate);
  });

  it("MATHEMATICAL PROOF: 2-step round-trip always results in net loss (Rate(A->B) * Rate(B->A) < 1.0)", () => {
    // Test across every possible pair of elements and all NPC configurations
    for (const elemA of ELEMENT_KEYS) {
      for (const elemB of ELEMENT_KEYS) {
        if (elemA === elemB) continue;

        for (const pers of PERSONALITIES) {
          for (const npcelem of ELEMENT_KEYS) {
            const forward = calculateNpcExchangeRate(elemA, elemB, pers, npcelem).effectiveRate;
            const backward = calculateNpcExchangeRate(elemB, elemA, pers, npcelem).effectiveRate;
            const roundTrip = forward * backward;

            expect(roundTrip).toBeLessThan(1.0);
          }
        }
      }
    }
  });

  it("MATHEMATICAL PROOF: 1,000 random 3-step triangular cycles (A -> B -> C -> A) never produce infinite profit", () => {
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const initialAmount = 1000;

    for (let i = 0; i < 1000; i++) {
      const idxA = Math.floor(pseudoRandom() * ELEMENT_KEYS.length);
      let idxB = Math.floor(pseudoRandom() * ELEMENT_KEYS.length);
      while (idxB === idxA) idxB = Math.floor(pseudoRandom() * ELEMENT_KEYS.length);
      let idxC = Math.floor(pseudoRandom() * ELEMENT_KEYS.length);
      while (idxC === idxA || idxC === idxB)
        idxC = Math.floor(pseudoRandom() * ELEMENT_KEYS.length);

      const elemA = ELEMENT_KEYS[idxA]!;
      const elemB = ELEMENT_KEYS[idxB]!;
      const elemC = ELEMENT_KEYS[idxC]!;

      const pers1 = PERSONALITIES[Math.floor(pseudoRandom() * PERSONALITIES.length)]!;
      const pers2 = PERSONALITIES[Math.floor(pseudoRandom() * PERSONALITIES.length)]!;
      const pers3 = PERSONALITIES[Math.floor(pseudoRandom() * PERSONALITIES.length)]!;

      const npc1 = ELEMENT_KEYS[Math.floor(pseudoRandom() * ELEMENT_KEYS.length)]!;
      const npc2 = ELEMENT_KEYS[Math.floor(pseudoRandom() * ELEMENT_KEYS.length)]!;
      const npc3 = ELEMENT_KEYS[Math.floor(pseudoRandom() * ELEMENT_KEYS.length)]!;

      // Step 1: A -> B
      const step1Out = calculateNpcTradeOutput(initialAmount, elemA, elemB, pers1, npc1);
      // Step 2: B -> C
      const step2Out = calculateNpcTradeOutput(step1Out, elemB, elemC, pers2, npc2);
      // Step 3: C -> A
      const step3Out = calculateNpcTradeOutput(step2Out, elemC, elemA, pers3, npc3);

      // Invariant: Final amount must strictly be less than initial amount
      expect(step3Out).toBeLessThan(initialAmount);
    }
  });
});
