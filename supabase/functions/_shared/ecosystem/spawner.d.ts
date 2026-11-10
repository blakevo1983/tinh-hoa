import type { PlanetTile } from "../schemas/planet.js";
import type { Genome } from "../schemas/genome.js";
import type { Rng } from "../types/rng.js";
/**
 * Maps biomes to native base species that can naturally emerge.
 */
export declare const BIOME_SPECIES_MAP: Record<string, string[]>;
export interface SpawnCreatureOptions {
    planetStage: number;
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
export declare function spawnWildCreatures(options: SpawnCreatureOptions): WildCreatureCandidate[];
//# sourceMappingURL=spawner.d.ts.map