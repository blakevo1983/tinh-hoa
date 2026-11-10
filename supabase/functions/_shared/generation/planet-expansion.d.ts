import { type ElementKey } from "../config/elements.js";
import type { PlanetTile } from "../schemas/planet.js";
export interface ExpandPlanetOptions {
    seed: number | string;
    primaryElement: ElementKey;
    currentGridSize: number;
    newGridSize: number;
}
/**
 * Pure function to deterministically generate newly expanded tiles when a planet evolves.
 * Invariant: Existing coordinates [0..currentGridSize-1, 0..currentGridSize-1] remain untouched.
 * Only tiles where x >= currentGridSize OR y >= currentGridSize are generated.
 */
export declare function generateExpandedTiles(options: ExpandPlanetOptions): PlanetTile[];
//# sourceMappingURL=planet-expansion.d.ts.map