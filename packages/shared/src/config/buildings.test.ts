import { describe, it, expect } from "vitest";
import {
  getBuildingCost,
  getBuildingTimeSec,
  getStorageCapBonus,
  calculateHarvesterProductionRate,
} from "./buildings.js";

describe("Buildings Config & Production Affinity (T1.5)", () => {
  it("computes building costs and build time scaling with level", () => {
    const costL1 = getBuildingCost("harvester", 1, "wood");
    expect(costL1.amount).toBe(30);
    expect(costL1.resourceKey).toBe("wood");

    const costL2 = getBuildingCost("harvester", 2, "wood");
    expect(costL2.amount).toBe(60);

    expect(getBuildingTimeSec("harvester", 1)).toBe(10);
    expect(getBuildingTimeSec("harvester", 2)).toBe(20);

    expect(getStorageCapBonus(1)).toBe(500);
    expect(getStorageCapBonus(3)).toBe(1500);
  });

  it("calculates base harvester production without neighbors", () => {
    // Richness 3, Level 1: 0.2 * 3 * 1 = 0.6 unit/sec
    const rate = calculateHarvesterProductionRate("fire", 3, 1, []);
    expect(rate).toBe(0.6);
  });

  it("increases production when adjacent to a generative neighbor (GDD 3.3)", () => {
    // Wood generates Fire (Mộc sinh Hỏa)
    // Richness 2, Level 1: base = 0.4
    // 1 Wood neighbor: modifier = 1.0 + 0.2 = 1.2 -> rate = 0.4 * 1.2 = 0.48
    const baseRate = calculateHarvesterProductionRate("fire", 2, 1, []);
    const boostedRate = calculateHarvesterProductionRate("fire", 2, 1, ["wood"]);

    expect(boostedRate).toBeGreaterThan(baseRate);
    expect(boostedRate).toBe(0.48);
  });

  it("decreases production when adjacent to an overcoming neighbor (GDD 3.3)", () => {
    // Water overcomes Fire (Thủy khắc Hỏa)
    // Richness 2, Level 1: base = 0.4
    // 1 Water neighbor: modifier = 1.0 - 0.33 = 0.67 -> rate = 0.4 * 0.67 = 0.268
    const baseRate = calculateHarvesterProductionRate("fire", 2, 1, []);
    const penalizedRate = calculateHarvesterProductionRate("fire", 2, 1, ["water"]);

    expect(penalizedRate).toBeLessThan(baseRate);
    expect(penalizedRate).toBe(0.268);
  });
});
