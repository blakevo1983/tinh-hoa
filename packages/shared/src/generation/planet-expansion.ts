import { ELEMENT_KEYS, type ElementKey } from "../config/elements.js";
import { BIOMES_BY_ELEMENT } from "../config/biomes.js";
import { seededRng } from "../types/rng.js";
import type { PlanetTile } from "../schemas/planet.js";

export interface ExpandPlanetOptions {
  seed: number | string;
  primaryElement: ElementKey;
  currentGridSize: number; // e.g. 12
  newGridSize: number; // e.g. 16
}

/**
 * Pure function to deterministically generate newly expanded tiles when a planet evolves.
 * Invariant: Existing coordinates [0..currentGridSize-1, 0..currentGridSize-1] remain untouched.
 * Only tiles where x >= currentGridSize OR y >= currentGridSize are generated.
 */
export function generateExpandedTiles(options: ExpandPlanetOptions): PlanetTile[] {
  const { seed, primaryElement, currentGridSize, newGridSize } = options;

  if (newGridSize <= currentGridSize) {
    throw new Error(
      `newGridSize (${newGridSize}) must be strictly greater than currentGridSize (${currentGridSize})`,
    );
  }

  // Derive unique deterministic seed for stage 2 expansion
  const expansionSeed = `${seed}:expansion:${newGridSize}`;
  const rng = seededRng(expansionSeed);

  const foreignElements = ELEMENT_KEYS.filter((elem) => elem !== primaryElement);
  const newTiles: PlanetTile[] = [];

  for (let y = 0; y < newGridSize; y++) {
    for (let x = 0; x < newGridSize; x++) {
      // Skip already existing inner grid
      if (x < currentGridSize && y < currentGridSize) {
        continue;
      }

      // In expanded territory: 65% primary element, 35% foreign
      const isPrimary = rng.next() < 0.65;
      const element: ElementKey = isPrimary
        ? primaryElement
        : foreignElements[rng.nextInt(0, foreignElements.length - 1)]!;

      const biomes = BIOMES_BY_ELEMENT[element];
      const biome = biomes[rng.nextInt(0, biomes.length - 1)]!.key;
      const richness = rng.nextInt(1, 5);

      newTiles.push({
        x,
        y,
        element,
        biome,
        richness,
      });
    }
  }

  return newTiles;
}
