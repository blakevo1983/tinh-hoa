import type { Genome } from "../schemas/genome.js";
export interface EcosystemCreatureInfo {
    speciesKey: string;
    genome: Genome;
    tileX?: number;
    tileY?: number;
}
export interface EcosystemHealthReport {
    totalCreatures: number;
    speciesDiversity: number;
    overallHarmony: number;
    degradationMultiplier: number;
    isOvercrowded: boolean;
    notesVi: string[];
}
/**
 * Pure function: calculates ecosystem health, biodiversity and tile degradation according to GDD 5.
 * A single dominant overpopulated species causes ecological degradation (yield penalty).
 * High biodiversity and harmony boost planetary ecosystem vitality.
 */
export declare function calculateEcosystemHealth(creatures: EcosystemCreatureInfo[], gridSize?: number): EcosystemHealthReport;
//# sourceMappingURL=balance.d.ts.map