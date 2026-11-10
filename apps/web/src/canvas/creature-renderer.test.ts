import { describe, it, expect, vi } from "vitest";
import { renderCreature } from "./creature-renderer.js";
import type { Genome } from "@tinh-hoa/shared";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  } as unknown as CanvasRenderingContext2D;
}

describe("Procedural Creature Renderer (T2.6)", () => {
  it("renders a pure Metal creature and outputs structured draw operations matching snapshot", () => {
    const ctx = createMockContext();
    const metalGenome: Genome = {
      primary: "metal",
      secondary: null,
      stats: { qi: 40, guard: 50, agility: 20, harmony: 40, chaos: 10 },
      traits: ["iron_skin"],
      generation: 1,
      inbreeding: 0,
    };

    const drawLog = renderCreature(ctx, metalGenome, {
      size: 100,
      centerX: 50,
      centerY: 50,
    });

    expect(drawLog.primaryElement).toBe("metal");
    expect(drawLog.secondaryElement).toBeNull();

    // Verify operations structure
    const ops = drawLog.operations.map((o) => o.op);
    expect(ops).toContain("gradient");
    expect(ops).toContain("polygon"); // Metal hexagonal body
    expect(ops).toContain("stroke");
    expect(ops).toContain("badge");

    // Snapshot match structured draw operations
    expect(drawLog).toMatchSnapshot();
  });

  it("renders a hybrid Water + Wood creature with dual-element blend and traits matching snapshot", () => {
    const ctx = createMockContext();
    const hybridGenome: Genome = {
      primary: "water",
      secondary: "wood",
      stats: { qi: 60, guard: 25, agility: 45, harmony: 70, chaos: 15 },
      traits: ["photosynthesis"],
      generation: 2,
      inbreeding: 0,
    };

    const drawLog = renderCreature(ctx, hybridGenome, {
      size: 120,
      centerX: 60,
      centerY: 60,
    });

    expect(drawLog.primaryElement).toBe("water");
    expect(drawLog.secondaryElement).toBe("wood");

    const ops = drawLog.operations.map((o) => o.op);
    expect(ops).toContain("gradient");
    expect(ops).toContain("arc"); // Water droplet
    expect(ops).toContain("badge");

    // Trait photosynthesis adds a green crest
    const traitOp = drawLog.operations.find((o) => o.params?.trait === "photosynthesis");
    expect(traitOp).toBeDefined();

    expect(drawLog).toMatchSnapshot();
  });

  it("generates deterministic draw logs for the same genome", () => {
    const ctx1 = createMockContext();
    const ctx2 = createMockContext();

    const fireGenome: Genome = {
      primary: "fire",
      secondary: null,
      stats: { qi: 55, guard: 20, agility: 35, harmony: 15, chaos: 40 },
      traits: ["blazing_spark"],
      generation: 1,
      inbreeding: 0,
    };

    const log1 = renderCreature(ctx1, fireGenome, { size: 100, centerX: 50, centerY: 50 });
    const log2 = renderCreature(ctx2, fireGenome, { size: 100, centerX: 50, centerY: 50 });

    expect(log1).toEqual(log2);
  });
});
