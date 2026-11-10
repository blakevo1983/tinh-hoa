export interface Clock {
    /** Returns current timestamp in milliseconds */
    now(): number;
}
/** Real system clock for production use */
export declare const systemClock: Clock;
export interface FakeClock extends Clock {
    advance(ms: number): void;
    set(timeMs: number): void;
}
/**
 * Deterministic fake clock for testing time-dependent logic.
 */
export declare function createFakeClock(initialTime?: number): FakeClock;
export declare const fakeClock: typeof createFakeClock;
//# sourceMappingURL=clock.d.ts.map