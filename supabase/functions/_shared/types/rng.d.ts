export interface Rng {
    /**
     * Returns a pseudo-random floating point number in [0, 1).
     */
    next(): number;
    /**
     * Returns a pseudo-random integer in [min, max] inclusive.
     */
    nextInt(min: number, max: number): number;
}
/**
 * Deterministic pseudo-random number generator using Mulberry32.
 * Pure function: Does NOT use Math.random().
 */
export declare function seededRng(seed: number | string): Rng;
//# sourceMappingURL=rng.d.ts.map