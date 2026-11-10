import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { generatePlanet } from "./planet-generator.js";
import { ELEMENT_KEYS, type ElementKey } from "../config/elements.js";
import { BIOMES_BY_ELEMENT } from "../config/biomes.js";

/**
 * Checks if all primary element tiles form a single contiguous 4-connected cluster.
 */
function isContiguousPrimaryCluster(
  tiles: Array<{ x: number; y: number; element: ElementKey }>,
  primaryElement: ElementKey,
): boolean {
  const primaryCoords = new Set(
    tiles.filter((tile) => tile.element === primaryElement).map((tile) => `${tile.x},${tile.y}`),
  );

  if (primaryCoords.size === 0) return false;

  // Pick first primary tile as start node
  const [firstKey] = primaryCoords;
  if (!firstKey) return false;

  const visited = new Set<string>();
  const queue: string[] = [firstKey];
  visited.add(firstKey);

  const CARDINAL_OFFSETS = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const [cx, cy] = current.split(",").map(Number);

    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const neighborKey = `${cx! + dx},${cy! + dy}`;
      if (primaryCoords.has(neighborKey) && !visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push(neighborKey);
      }
    }
  }

  // If visited size equals total primary tiles, the cluster is contiguous
  return visited.size === primaryCoords.size;
}

describe("Planet Generator (T1.1)", () => {
  it("produces identical output for identical seed and inputs (deterministic)", () => {
    const planetA = generatePlanet({ seed: 12345678, primaryElement: "wood", gridSize: 12 });
    const planetB = generatePlanet({ seed: 12345678, primaryElement: "wood", gridSize: 12 });

    expect(planetA).toEqual(planetB);
  });

  it("matches fixed snapshot for seed 42", () => {
    const planet = generatePlanet({ seed: 42, primaryElement: "fire", gridSize: 12 });

    expect(planet.seed).toBe(42);
    expect(planet.primaryElement).toBe("fire");
    expect(planet.gridSize).toBe(12);
    expect(planet.tiles.length).toBe(144);

    const primaryCount = planet.tiles.filter((t) => t.element === "fire").length;
    const ratio = primaryCount / 144;
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.7);

    // Verify first 5 tiles snapshot values
    expect(planet.tiles.slice(0, 5)).toMatchInlineSnapshot(`
      [
        {
          "biome": "plasma_steppe",
          "element": "thunder",
          "richness": 3,
          "x": 0,
          "y": 0,
        },
        {
          "biome": "shadow_abyss",
          "element": "dark",
          "richness": 5,
          "x": 1,
          "y": 0,
        },
        {
          "biome": "flowering_meadow",
          "element": "wood",
          "richness": 4,
          "x": 2,
          "y": 0,
        },
        {
          "biome": "vital_swamp",
          "element": "wood",
          "richness": 1,
          "x": 3,
          "y": 0,
        },
        {
          "biome": "radiant_grove",
          "element": "light",
          "richness": 2,
          "x": 4,
          "y": 0,
        },
      ]
    `);
  });

  it("guarantees contiguous primary cluster on default 12x12 grid", () => {
    for (const element of ELEMENT_KEYS) {
      const planet = generatePlanet({
        seed: 9999 + element.length,
        primaryElement: element,
        gridSize: 12,
      });
      expect(isContiguousPrimaryCluster(planet.tiles, element)).toBe(true);
    }
  });

  // Property testing using fast-check over 1,000 random seeds (Acceptance Criteria)
  it("satisfies all invariants across 1,000 random seeds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2147483647 }),
        fc.constantFrom(...ELEMENT_KEYS),
        fc.constantFrom(12, 16),
        (seed, primaryElement, gridSize) => {
          const planet = generatePlanet({ seed, primaryElement, gridSize });
          const totalTiles = gridSize * gridSize;

          // Invariant 1: Correct total tile count
          if (planet.tiles.length !== totalTiles) return false;

          // Invariant 2: Primary element count is strictly within 60% to 70%
          const primaryCount = planet.tiles.filter((t) => t.element === primaryElement).length;
          const ratio = primaryCount / totalTiles;
          if (ratio < 0.6 || ratio > 0.7) return false;

          // Invariant 3: Primary element forms a contiguous cluster
          if (!isContiguousPrimaryCluster(planet.tiles, primaryElement)) return false;

          // Invariant 4: Every tile has valid coordinates, element, biome, richness
          for (const tile of planet.tiles) {
            if (tile.x < 0 || tile.x >= gridSize) return false;
            if (tile.y < 0 || tile.y >= gridSize) return false;
            if (tile.richness < 1 || tile.richness > 5) return false;

            const validBiomes = BIOMES_BY_ELEMENT[tile.element].map((b) => b.key);
            if (!validBiomes.includes(tile.biome)) return false;
          }

          return true;
        },
      ),
      { numRuns: 1000 },
    );
  });
});
