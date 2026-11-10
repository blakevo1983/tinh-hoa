import { type ElementKey } from "../config/elements.js";
import type { GeneratedPlanet } from "../schemas/planet.js";
export interface GeneratePlanetOptions {
    seed: number | string;
    primaryElement: ElementKey;
    gridSize?: number;
}
/**
 * Pure function to generate a deterministic planet grid from a given seed.
 * - 60% to 70% of tiles are the primary element, forming a contiguous connected cluster.
 * - Remaining tiles are foreign elements distributed around the grid.
 * - Biomes and richness (1..5) are deterministically generated per tile.
 */
export declare function generatePlanet(options: GeneratePlanetOptions): GeneratedPlanet;
//# sourceMappingURL=planet-generator.d.ts.map