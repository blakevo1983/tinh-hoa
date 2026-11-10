import type { Genome } from "../schemas/genome.js";
export interface CreatureDropResult {
    itemKey: string;
    qty: number;
    isHybridDrop: boolean;
}
/**
 * Pure function: determine the resource or crafted material dropped by a creature (GDD 6).
 * Pure element creatures produce raw elements.
 * Hybrid creatures produce compound or legendary materials corresponding to their element pair.
 */
export declare function getCreatureDrop(genome: Genome): CreatureDropResult;
//# sourceMappingURL=drops.d.ts.map