import { describe, it, expect } from "vitest";
import { generateExpandedTiles } from "./planet-expansion.js";
import { ELEMENT_KEYS } from "../config/elements.js";

describe("Planet Grid Expansion (Pure function)", () => {
  it("expands a 12x12 grid to 16x16 with exactly 112 new tiles", () => {
    const newTiles = generateExpandedTiles({
      seed: "test-seed-12345",
      primaryElement: "metal",
      currentGridSize: 12,
      newGridSize: 16,
    });

    // 16*16 = 256, 12*12 = 144 -> 256 - 144 = 112
    expect(newTiles).toHaveLength(112);

    // Verify all coordinates are strictly within [0..15] and NOT in [0..11, 0..11]
    const coordSet = new Set<string>();
    for (const tile of newTiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(16);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(16);

      // Must be in the expansion region
      const isOldRegion = tile.x < 12 && tile.y < 12;
      expect(isOldRegion).toBe(false);

      const key = `${tile.x},${tile.y}`;
      expect(coordSet.has(key)).toBe(false);
      coordSet.add(key);

      expect(ELEMENT_KEYS).toContain(tile.element);
      expect(tile.richness).toBeGreaterThanOrEqual(1);
      expect(tile.richness).toBeLessThanOrEqual(5);
    }
  });

  it("is 100% deterministic given the same seed and parameters", () => {
    const tilesRun1 = generateExpandedTiles({
      seed: "deterministic-seed-alpha",
      primaryElement: "water",
      currentGridSize: 12,
      newGridSize: 16,
    });

    const tilesRun2 = generateExpandedTiles({
      seed: "deterministic-seed-alpha",
      primaryElement: "water",
      currentGridSize: 12,
      newGridSize: 16,
    });

    expect(tilesRun1).toEqual(tilesRun2);
  });

  it("throws an error if newGridSize <= currentGridSize", () => {
    expect(() =>
      generateExpandedTiles({
        seed: 42,
        primaryElement: "fire",
        currentGridSize: 16,
        newGridSize: 16,
      }),
    ).toThrow(/must be strictly greater/);

    expect(() =>
      generateExpandedTiles({
        seed: 42,
        primaryElement: "fire",
        currentGridSize: 16,
        newGridSize: 12,
      }),
    ).toThrow(/must be strictly greater/);
  });
});
