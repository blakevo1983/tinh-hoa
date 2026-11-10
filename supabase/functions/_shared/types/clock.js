/** Real system clock for production use */
export const systemClock = {
    now: () => Date.now(),
};
/**
 * Deterministic fake clock for testing time-dependent logic.
 */
export function createFakeClock(initialTime = 0) {
    let currentTime = initialTime;
    return {
        now: () => currentTime,
        advance: (ms) => {
            if (ms < 0) {
                throw new Error("Cannot advance clock backwards in time");
            }
            currentTime += ms;
        },
        set: (timeMs) => {
            currentTime = timeMs;
        },
    };
}
export const fakeClock = createFakeClock;
//# sourceMappingURL=clock.js.map