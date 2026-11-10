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
 * Hash string to 32-bit unsigned integer using FNV-1a algorithm.
 */
function hashStringToUint32(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic pseudo-random number generator using Mulberry32.
 * Pure function: Does NOT use Math.random().
 */
export function seededRng(seed: number | string): Rng {
  let state = typeof seed === "string" ? hashStringToUint32(seed) : seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    if (min > max) {
      throw new Error(`min (${min}) cannot be greater than max (${max})`);
    }
    const range = max - min + 1;
    return min + Math.floor(next() * range);
  };

  return { next, nextInt };
}
