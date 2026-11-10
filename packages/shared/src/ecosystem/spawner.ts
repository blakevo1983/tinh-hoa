import type { PlanetTile } from "../schemas/planet.js";
import { SPECIES_BY_KEY, type SpeciesDefinition } from "../config/species.js";
import type { Genome } from "../schemas/genome.js";
import type { Rng } from "../types/rng.js";

/**
 * Maps biomes to native base species that can naturally emerge.
 */
export const BIOME_SPECIES_MAP: Record<string, string[]> = {
  // Metal biomes
  iron_crags: ["iron_beetle", "metal_golem"],
  mercury_basin: ["iron_beetle"],
  alloy_ridge: ["metal_golem"],

  // Wood biomes
  verdant_forest: ["verdant_sprout", "vine_crawler"],
  vital_swamp: ["vine_crawler"],
  ancient_canopy: ["verdant_sprout"],

  // Water biomes
  abyssal_lake: ["aqua_slime", "frost_fin"],
  crystal_falls: ["aqua_slime"],
  frozen_fjord: ["frost_fin"],

  // Fire biomes
  magma_river: ["lava_tortoise", "ember_wisp"],
  ash_plains: ["ember_wisp"],
  obsidian_peak: ["lava_tortoise"],

  // Earth biomes
  granite_plateau: ["stone_pangolin"],
  fertile_valley: ["stone_pangolin", "crystal_mole"],
  crystal_caves: ["crystal_mole"],
};

export interface SpawnCreatureOptions {
  planetStage: number; // 1 to 5
  tiles: PlanetTile[];
  existingCreaturesCount: number;
  rng: Rng;
}

export interface WildCreatureCandidate {
  speciesKey: string;
  genome: Genome;
  tileX: number;
  tileY: number;
}

/**
 * Pure function: determine if and where new wild creatures emerge on a planet.
 * Respects planet stage carrying capacity.
 */
export function spawnWildCreatures(options: SpawnCreatureOptions): WildCreatureCandidate[] {
  const { planetStage, tiles, existingCreaturesCount, rng } = options;

  // Stage carrying capacity: Stage 1 = 3 creatures, Stage 2 = 6, Stage 3 = 10...
  const maxCapacity = Math.min(20, planetStage * 3);
  const remainingSlots = Math.max(0, maxCapacity - existingCreaturesCount);

  if (remainingSlots <= 0 || tiles.length === 0) {
    return [];
  }

  const spawned: WildCreatureCandidate[] = [];
  // Chance to spawn depends on remaining capacity
  const spawnAttempts = Math.min(remainingSlots, 2);

  for (let i = 0; i < spawnAttempts; i++) {
    // 35% chance per available slot to spawn a creature
    if (rng.next() > 0.35) {
      continue;
    }

    const randomTile = tiles[rng.nextInt(0, tiles.length - 1)]!;
    const candidateSpeciesKeys = BIOME_SPECIES_MAP[randomTile.biome] || [];

    if (candidateSpeciesKeys.length === 0) {
      continue;
    }

    const speciesKey = candidateSpeciesKeys[rng.nextInt(0, candidateSpeciesKeys.length - 1)]!;
    const def: SpeciesDefinition = SPECIES_BY_KEY[speciesKey]!;

    // Slightly randomize base stats around base definition (+/- 10%)
    const randomizeStat = (val: number): number => {
      const delta = (rng.next() * 2 - 1) * 0.1 * val;
      return Math.max(1, Math.min(100, Math.round(val + delta)));
    };

    const genome: Genome = {
      primary: def.element,
      secondary: null,
      stats: {
        qi: randomizeStat(def.baseStats.qi),
        guard: randomizeStat(def.baseStats.guard),
        agility: randomizeStat(def.baseStats.agility),
        harmony: randomizeStat(def.baseStats.harmony),
        chaos: randomizeStat(def.baseStats.chaos),
      },
      traits: [...def.defaultTraits],
      generation: 1,
      inbreeding: 0,
    };

    spawned.push({
      speciesKey,
      genome,
      tileX: randomTile.x,
      tileY: randomTile.y,
    });
  }

  return spawned;
}
