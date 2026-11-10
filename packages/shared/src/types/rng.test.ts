import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { seededRng } from "./rng.js";

describe("seededRng", () => {
  it("produces identical sequence for identical number seed", () => {
    const rng1 = seededRng(12345);
    const rng2 = seededRng(12345);

    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("produces identical sequence for identical string seed", () => {
    const rng1 = seededRng("planet-seed-42");
    const rng2 = seededRng("planet-seed-42");

    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequence for different seeds", () => {
    const rng1 = seededRng(100);
    const rng2 = seededRng(200);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  it("nextInt generates values within [min, max] inclusive", () => {
    const rng = seededRng(999);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("satisfies determinism property for any seed via fast-check", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const r1 = seededRng(seed);
        const r2 = seededRng(seed);
        for (let i = 0; i < 5; i++) {
          if (r1.next() !== r2.next()) return false;
        }
        return true;
      }),
    );
  });
});
