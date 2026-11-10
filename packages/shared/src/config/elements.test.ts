import { describe, it, expect } from "vitest";
import {
  ELEMENT_KEYS,
  ELEMENT_DEFINITIONS,
  GENERATION_RELATIONS,
  OVERCOMING_RELATIONS,
  isGenerativeRelation,
  isOvercomingRelation,
  getAffinityMultiplier,
  COMBAT_MULTIPLIERS,
} from "./elements.js";

describe("Element Matrix & Config", () => {
  it("defines exactly 8 elements with valid visual markers", () => {
    expect(ELEMENT_KEYS).toHaveLength(8);
    for (const key of ELEMENT_KEYS) {
      const def = ELEMENT_DEFINITIONS[key];
      expect(def).toBeDefined();
      expect(def.key).toBe(key);
      expect(def.nameVi.length).toBeGreaterThan(0);
      expect(def.pastelColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(def.symbol.length).toBeGreaterThan(0);
    }
  });

  it("verifies base stats match GDD section 3.2", () => {
    expect(ELEMENT_DEFINITIONS.metal.baseStats).toEqual({
      qi: 3,
      guard: 5,
      agility: 2,
      harmony: 3,
      chaos: 1,
    });
    expect(ELEMENT_DEFINITIONS.wood.baseStats).toEqual({
      qi: 3,
      guard: 3,
      agility: 3,
      harmony: 4,
      chaos: 2,
    });
    expect(ELEMENT_DEFINITIONS.water.baseStats).toEqual({
      qi: 3,
      guard: 3,
      agility: 4,
      harmony: 4,
      chaos: 2,
    });
    expect(ELEMENT_DEFINITIONS.fire.baseStats).toEqual({
      qi: 5,
      guard: 2,
      agility: 4,
      harmony: 2,
      chaos: 5,
    });
    expect(ELEMENT_DEFINITIONS.earth.baseStats).toEqual({
      qi: 3,
      guard: 5,
      agility: 1,
      harmony: 4,
      chaos: 1,
    });
    expect(ELEMENT_DEFINITIONS.light.baseStats).toEqual({
      qi: 4,
      guard: 3,
      agility: 3,
      harmony: 5,
      chaos: 2,
    });
    expect(ELEMENT_DEFINITIONS.dark.baseStats).toEqual({
      qi: 5,
      guard: 3,
      agility: 3,
      harmony: 1,
      chaos: 4,
    });
    expect(ELEMENT_DEFINITIONS.thunder.baseStats).toEqual({
      qi: 4,
      guard: 1,
      agility: 5,
      harmony: 2,
      chaos: 5,
    });
  });

  it("verifies generation relations (A sinh B) match GDD section 3.3", () => {
    // Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
    expect(isGenerativeRelation("wood", "fire")).toBe(true);
    expect(isGenerativeRelation("fire", "earth")).toBe(true);
    expect(isGenerativeRelation("earth", "metal")).toBe(true);
    expect(isGenerativeRelation("metal", "water")).toBe(true);
    expect(isGenerativeRelation("water", "wood")).toBe(true);

    // Quang→Mộc, Ám→Thủy, Lôi→Hỏa
    expect(isGenerativeRelation("light", "wood")).toBe(true);
    expect(isGenerativeRelation("dark", "water")).toBe(true);
    expect(isGenerativeRelation("thunder", "fire")).toBe(true);

    expect(GENERATION_RELATIONS).toHaveLength(8);
  });

  it("verifies overcoming relations (A khắc B) match GDD section 3.3", () => {
    // Mộc→Thổ→Thủy→Hỏa→Kim→Mộc
    expect(isOvercomingRelation("wood", "earth")).toBe(true);
    expect(isOvercomingRelation("earth", "water")).toBe(true);
    expect(isOvercomingRelation("water", "fire")).toBe(true);
    expect(isOvercomingRelation("fire", "metal")).toBe(true);
    expect(isOvercomingRelation("metal", "wood")).toBe(true);

    // Quang↔Ám khắc lẫn nhau
    expect(isOvercomingRelation("light", "dark")).toBe(true);
    expect(isOvercomingRelation("dark", "light")).toBe(true);

    // Lôi→Thủy, Lôi→Kim, Thổ→Lôi
    expect(isOvercomingRelation("thunder", "water")).toBe(true);
    expect(isOvercomingRelation("thunder", "metal")).toBe(true);
    expect(isOvercomingRelation("earth", "thunder")).toBe(true);

    expect(OVERCOMING_RELATIONS).toHaveLength(10);
  });

  it("calculates combat affinity multipliers accurately", () => {
    expect(getAffinityMultiplier("water", "fire")).toBe(COMBAT_MULTIPLIERS.overcomes);
    expect(getAffinityMultiplier("fire", "water")).toBe(COMBAT_MULTIPLIERS.isOvercome);
    expect(getAffinityMultiplier("metal", "metal")).toBe(COMBAT_MULTIPLIERS.neutral);
  });
});
