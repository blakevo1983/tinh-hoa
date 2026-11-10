import { describe, it, expect } from "vitest";
import { GenomeSchema } from "./genome.js";

describe("GenomeSchema", () => {
  const validGenome = {
    primary: "wood",
    secondary: "water",
    stats: {
      qi: 50,
      guard: 40,
      agility: 30,
      harmony: 70,
      chaos: 15,
    },
    traits: ["fast_growth", "durable"],
    generation: 1,
    inbreeding: 0,
  };

  it("parses valid genome correctly", () => {
    const result = GenomeSchema.safeParse(validGenome);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primary).toBe("wood");
      expect(result.data.secondary).toBe("water");
      expect(result.data.stats.qi).toBe(50);
    }
  });

  it("allows null secondary element", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      secondary: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects stats less than minimum boundary (min 1)", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      stats: {
        ...validGenome.stats,
        qi: 0,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects stats exceeding maximum boundary (max 100)", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      stats: {
        ...validGenome.stats,
        chaos: 101,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer stats", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      stats: {
        ...validGenome.stats,
        agility: 25.5,
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid element keys", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      primary: "plasma",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 traits", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      traits: ["trait1", "trait2", "trait3", "trait4"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects generation less than 1", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      generation: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative inbreeding level", () => {
    const result = GenomeSchema.safeParse({
      ...validGenome,
      inbreeding: -1,
    });
    expect(result.success).toBe(false);
  });
});
