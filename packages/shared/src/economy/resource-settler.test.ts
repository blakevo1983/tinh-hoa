import { describe, it, expect } from "vitest";
import {
  settleResource,
  settleAllResources,
  DEFAULT_OFFLINE_CAP_SEC,
  type ResourceBalanceState,
} from "./resource-settler.js";
import { fakeClock } from "../types/clock.js";

describe("Resource Settler - Lazy & Offline progression (T1.4)", () => {
  const baseBalance: ResourceBalanceState = {
    amount: 50,
    ratePerSec: 0.5, // 0.5 unit/sec
    cap: 500,
    updatedAtMs: 1000000,
  };

  it("settles accurately after 1 minute (60 seconds)", () => {
    const clock = fakeClock(baseBalance.updatedAtMs);
    clock.advance(60 * 1000); // +60s

    const result = settleResource(baseBalance, { nowMs: clock.now() });

    // 60 sec * 0.5 = 30 units produced
    expect(result.producedDelta).toBe(30);
    expect(result.amount).toBe(80); // 50 + 30
    expect(result.updatedAtMs).toBe(clock.now());
  });

  it("settles accurately after 1 hour (3600 seconds)", () => {
    const clock = fakeClock(baseBalance.updatedAtMs);
    clock.advance(3600 * 1000); // +1 hour

    const result = settleResource(baseBalance, { nowMs: clock.now() });

    // 3600 sec * 0.5 = 1800 units, but capped at 500
    // initial 50 + 1800 = 1850 -> capped to 500
    expect(result.amount).toBe(500);
    expect(result.producedDelta).toBe(450); // 500 - 50
  });

  it("settles with high cap after 1 hour without hitting cap", () => {
    const highCapBalance: ResourceBalanceState = {
      ...baseBalance,
      cap: 10000,
    };
    const clock = fakeClock(highCapBalance.updatedAtMs);
    clock.advance(3600 * 1000); // +1 hour

    const result = settleResource(highCapBalance, { nowMs: clock.now() });

    // 3600 * 0.5 = 1800 units produced
    expect(result.producedDelta).toBe(1800);
    expect(result.amount).toBe(1850); // 50 + 1800
  });

  it("enforces offline cap strictly after 24 hours (86,400s capped to 8 hours)", () => {
    const highCapBalance: ResourceBalanceState = {
      amount: 100,
      ratePerSec: 1, // 1 unit/sec
      cap: 100000,
      updatedAtMs: 1000000,
    };
    const clock = fakeClock(highCapBalance.updatedAtMs);
    clock.advance(24 * 3600 * 1000); // +24 hours

    const result = settleResource(highCapBalance, { nowMs: clock.now() });

    // Capped at 8 hours (28,800 seconds) * 1 unit/sec = 28,800 units produced
    expect(result.producedDelta).toBe(DEFAULT_OFFLINE_CAP_SEC * 1);
    expect(result.amount).toBe(100 + DEFAULT_OFFLINE_CAP_SEC);
  });

  it("handles clock rollbacks/negative elapsed safely without losing resources", () => {
    const result = settleResource(baseBalance, { nowMs: baseBalance.updatedAtMs - 50000 });

    expect(result.producedDelta).toBe(0);
    expect(result.amount).toBe(baseBalance.amount);
  });

  it("settles multiple resources concurrently via settleAllResources", () => {
    const balances: Record<string, ResourceBalanceState> = {
      wood: { amount: 10, ratePerSec: 1, cap: 200, updatedAtMs: 1000 },
      water: { amount: 20, ratePerSec: 0.5, cap: 200, updatedAtMs: 1000 },
    };

    const settled = settleAllResources(balances, { nowMs: 1000 + 100 * 1000 }); // +100s

    expect(settled.wood?.amount).toBe(110); // 10 + 100*1
    expect(settled.water?.amount).toBe(70); // 20 + 100*0.5
  });
});
