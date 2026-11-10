export interface Clock {
  /** Returns current timestamp in milliseconds */
  now(): number;
}

/** Real system clock for production use */
export const systemClock: Clock = {
  now: () => Date.now(),
};

export interface FakeClock extends Clock {
  advance(ms: number): void;
  set(timeMs: number): void;
}

/**
 * Deterministic fake clock for testing time-dependent logic.
 */
export function createFakeClock(initialTime = 0): FakeClock {
  let currentTime = initialTime;

  return {
    now: () => currentTime,
    advance: (ms: number) => {
      if (ms < 0) {
        throw new Error("Cannot advance clock backwards in time");
      }
      currentTime += ms;
    },
    set: (timeMs: number) => {
      currentTime = timeMs;
    },
  };
}
