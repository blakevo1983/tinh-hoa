import type { ElementKey } from "../config/elements.js";
import { type Genome } from "../schemas/genome.js";
import type { Rng } from "../types/rng.js";
import type { Clock } from "../types/clock.js";
export type ElementRelation = "same" | "generative" | "destructive" | "polar" | "neutral";
/**
 * Pure function: determine elemental relationship between two elements according to GDD 7.
 */
export declare function getElementRelation(a: ElementKey, b: ElementKey): ElementRelation;
export interface BreedParent {
    id: string;
    speciesKey: string;
    genome: Genome;
    parentAId?: string | null;
    parentBId?: string | null;
}
export interface BreedCatalyst {
    itemKey: string;
    element: ElementKey;
}
export interface BreedOptions {
    parentA: BreedParent;
    parentB: BreedParent;
    catalyst?: BreedCatalyst;
    rng: Rng;
    clock: Clock;
    planetId: string;
}
export interface BreedEffect {
    type: string;
    [key: string]: unknown;
}
export interface BreedResult {
    childGenome: Genome;
    childSpeciesKey: string;
    relation: ElementRelation;
    hatchDurationSec: number;
    finishAtIso: string;
    effects: BreedEffect[];
}
/**
 * Pure function: breed two parent creatures according to GDD 7 rules.
 * Never uses Date.now() or Math.random(); strictly accepts clock and rng.
 */
export declare function breed(options: BreedOptions): BreedResult;
//# sourceMappingURL=breed.d.ts.map