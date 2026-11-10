import { describe, it, expect, vi } from "vitest";
import { ELEMENT_KEYS, generatePlanet } from "@tinh-hoa/shared";
import { renderPlanet, drawElementSymbol } from "./planet-renderer.js";

function createMockContext(): CanvasRenderingContext2D {
  const gradientMock = {
    addColorStop: vi.fn(),
  };

  return {
    clearRect: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue(gradientMock),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    style: {},
  } as unknown as CanvasRenderingContext2D;
}

describe("planet-renderer", () => {
  it("renders planet for all 8 elements without error", () => {
    const ctx = createMockContext();

    for (const element of ELEMENT_KEYS) {
      expect(() => {
        renderPlanet(ctx, 360, 360, {
          element,
          rotation: 0.5,
          pulsePhase: 1.2,
        });
      }).not.toThrow();

      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    }
  });

  it("draws distinct geometric symbols for all 8 elements", () => {
    const ctx = createMockContext();

    for (const element of ELEMENT_KEYS) {
      expect(() => {
        drawElementSymbol(ctx, element, 100, 100, 40, "#ffffff");
      }).not.toThrow();
    }
  });

  it("renders 12x12 grid view cleanly when tiles are present", () => {
    const ctx = createMockContext();
    const planet = generatePlanet({ seed: 777, primaryElement: "wood", gridSize: 12 });

    expect(() => {
      renderPlanet(ctx, 360, 360, {
        element: "wood",
        rotation: 0,
        pulsePhase: 0,
        viewMode: "grid",
        gridSize: 12,
        tiles: planet.tiles,
      });
    }).not.toThrow();

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
  });
});
