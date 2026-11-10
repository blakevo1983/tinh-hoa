import { ELEMENT_KEYS } from "../config/elements.js";
import { BIOMES_BY_ELEMENT } from "../config/biomes.js";
import { seededRng } from "../types/rng.js";
/**
 * Pure function to generate a deterministic planet grid from a given seed.
 * - 60% to 70% of tiles are the primary element, forming a contiguous connected cluster.
 * - Remaining tiles are foreign elements distributed around the grid.
 * - Biomes and richness (1..5) are deterministically generated per tile.
 */
export function generatePlanet(options) {
    const { seed, primaryElement, gridSize = 12 } = options;
    if (gridSize < 4 || gridSize > 64) {
        throw new Error(`gridSize (${gridSize}) must be between 4 and 64`);
    }
    const numericSeed = typeof seed === "number"
        ? seed >>> 0
        : Array.from(seed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0);
    const rng = seededRng(numericSeed);
    const totalTiles = gridSize * gridSize;
    // Primary element proportion: strictly 60% to 70%
    const minPrimary = Math.ceil(totalTiles * 0.6);
    const maxPrimary = Math.floor(totalTiles * 0.7);
    const targetPrimaryCount = rng.nextInt(minPrimary, maxPrimary);
    // Set to store primary tile coordinates: "x,y"
    const primaryTileKeys = new Set();
    // Pick initial seed center for cluster expansion
    const startX = rng.nextInt(0, gridSize - 1);
    const startY = rng.nextInt(0, gridSize - 1);
    const startKey = `${startX},${startY}`;
    primaryTileKeys.add(startKey);
    // Frontier list of adjacent candidate coordinates for contiguous expansion
    const frontierSet = new Set();
    const frontierList = [];
    const addFrontierNeighbor = (x, y) => {
        const key = `${x},${y}`;
        if (!primaryTileKeys.has(key) && !frontierSet.has(key)) {
            frontierSet.add(key);
            frontierList.push({ x, y });
        }
    };
    const CARDINAL_OFFSETS = [
        { dx: 0, dy: -1 }, // North
        { dx: 0, dy: 1 }, // South
        { dx: -1, dy: 0 }, // West
        { dx: 1, dy: 0 }, // East
    ];
    const exploreNeighbors = (cx, cy) => {
        for (const offset of CARDINAL_OFFSETS) {
            const nx = cx + offset.dx;
            const ny = cy + offset.dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                addFrontierNeighbor(nx, ny);
            }
        }
    };
    exploreNeighbors(startX, startY);
    // Contiguous cluster expansion until target primary count is met
    while (primaryTileKeys.size < targetPrimaryCount && frontierList.length > 0) {
        // Pick random candidate from frontier
        const pickIndex = rng.nextInt(0, frontierList.length - 1);
        const chosen = frontierList[pickIndex];
        // Remove from frontier list (swap-and-pop)
        const last = frontierList.pop();
        if (pickIndex < frontierList.length) {
            frontierList[pickIndex] = last;
        }
        frontierSet.delete(`${chosen.x},${chosen.y}`);
        primaryTileKeys.add(`${chosen.x},${chosen.y}`);
        exploreNeighbors(chosen.x, chosen.y);
    }
    // Other 7 elements for foreign tiles
    const foreignElements = ELEMENT_KEYS.filter((elem) => elem !== primaryElement);
    // Construct tile array sorted by y then x
    const tiles = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const isPrimary = primaryTileKeys.has(`${x},${y}`);
            const element = isPrimary
                ? primaryElement
                : foreignElements[rng.nextInt(0, foreignElements.length - 1)];
            const biomes = BIOMES_BY_ELEMENT[element];
            const biome = biomes[rng.nextInt(0, biomes.length - 1)].key;
            // Richness scale: 1 to 5
            const richness = rng.nextInt(1, 5);
            tiles.push({
                x,
                y,
                element,
                biome,
                richness,
            });
        }
    }
    return {
        seed: numericSeed,
        primaryElement,
        gridSize,
        tiles,
    };
}
//# sourceMappingURL=planet-generator.js.map