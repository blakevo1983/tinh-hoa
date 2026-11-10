/**
 * Hash string to 32-bit unsigned integer using FNV-1a algorithm.
 */
function hashStringToUint32(str) {
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
export function seededRng(seed) {
    let state = typeof seed === "string" ? hashStringToUint32(seed) : seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const nextInt = (min, max) => {
        if (min > max) {
            throw new Error(`min (${min}) cannot be greater than max (${max})`);
        }
        const range = max - min + 1;
        return min + Math.floor(next() * range);
    };
    return { next, nextInt };
}
//# sourceMappingURL=rng.js.map