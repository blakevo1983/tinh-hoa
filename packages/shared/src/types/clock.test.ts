import { describe, it, expect } from "vitest";
import { createFakeClock, systemClock } from "./clock.js";

describe("Clock", () => {
  it("systemClock returns a positive timestamp", () => {
    const now = systemClock.now();
    expect(typeof now).toBe("number");
    expect(now).toBeGreaterThan(0);
  });

  it("fakeClock initializes with specified time and advances correctly", () => {
    const clock = createFakeClock(1000);
    expect(clock.now()).toBe(1000);

    clock.advance(500);
    expect(clock.now()).toBe(1500);

    clock.set(3000);
    expect(clock.now()).toBe(3000);
  });

  it("fakeClock rejects negative advancement", () => {
    const clock = createFakeClock(1000);
    expect(() => clock.advance(-100)).toThrow();
  });
});
