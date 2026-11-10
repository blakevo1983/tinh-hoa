import { describe, it, expect } from "vitest";
import { spawnWildCreatures, BIOME_SPECIES_MAP } from "./spawner.js";
import { calculateEcosystemHealth } from "./balance.js";
import { getCreatureDrop } from "./drops.js";
import { seededRng } from "../types/rng.js";
import type { PlanetTile } from "../schemas/planet.js";
import type { Genome } from "../schemas/genome.js";

describe("Planet Ecosystem & Spawning (T2.5)", () => {
  const sampleTiles: PlanetTile[] = [
    { x: 0, y: 0, element: "metal", biome: "iron_crags", richness: 3 },
    { x: 1, y: 0, element: "wood", biome: "verdant_forest", richness: 4 },
    { x: 0, y: 1, element: "water", biome: "abyssal_lake", richness: 2 },
    { x: 1, y: 1, element: "fire", biome: "magma_river", richness: 3 },
  ];

  it("spawns creatures compatible with tile biomes", () => {
    const rng = seededRng("spawn-test-seed-1");
    let spawnedCount = 0;

    for (let i = 0; i < 20; i++) {
      const candidates = spawnWildCreatures({
        planetStage: 2,
        tiles: sampleTiles,
        existingCreaturesCount: 0,
        rng,
      });

      for (const c of candidates) {
        spawnedCount++;
        const tile = sampleTiles.find((t) => t.x === c.tileX && t.y === c.tileY)!;
        expect(BIOME_SPECIES_MAP[tile.biome]).toContain(c.speciesKey);
        expect(c.genome.generation).toBe(1);
        expect(c.genome.inbreeding).toBe(0);
        expect(c.genome.stats.qi).toBeGreaterThanOrEqual(1);
        expect(c.genome.stats.qi).toBeLessThanOrEqual(100);
      }
    }

    expect(spawnedCount).toBeGreaterThan(0);
  });

  it("respects planet stage carrying capacity", () => {
    const rng = seededRng("capacity-test");
    // Stage 1 capacity is 3; if already 3 creatures exist, returns empty
    const candidates = spawnWildCreatures({
      planetStage: 1,
      tiles: sampleTiles,
      existingCreaturesCount: 3,
      rng,
    });

    expect(candidates).toHaveLength(0);
  });

  it("calculates ecosystem degradation under monoculture stress", () => {
    const dominantGenome: Genome = {
      primary: "wood",
      secondary: null,
      stats: { qi: 30, guard: 20, agility: 20, harmony: 20, chaos: 10 },
      traits: [],
      generation: 1,
      inbreeding: 0,
    };

    // 9 creatures of the exact same species out of 10 (90% monoculture)
    const monocultureCreatures = [
      ...Array.from({ length: 9 }, () => ({
        speciesKey: "verdant_sprout",
        genome: dominantGenome,
      })),
      {
        speciesKey: "aqua_slime",
        genome: dominantGenome,
      },
    ];

    const report = calculateEcosystemHealth(monocultureCreatures, 12);
    expect(report.totalCreatures).toBe(10);
    expect(report.speciesDiversity).toBe(2);
    expect(report.degradationMultiplier).toBeLessThan(1.0);
    expect(report.notesVi.some((n) => n.includes("Độc canh"))).toBe(true);
  });

  it("rewards biodiversity and high harmony with vitality bonus", () => {
    const diverseCreatures = [
      {
        speciesKey: "metal_golem",
        genome: {
          primary: "metal",
          secondary: null,
          stats: { qi: 40, guard: 40, agility: 20, harmony: 50, chaos: 5 },
          traits: [],
          generation: 1,
          inbreeding: 0,
        } as Genome,
      },
      {
        speciesKey: "verdant_sprout",
        genome: {
          primary: "wood",
          secondary: null,
          stats: { qi: 40, guard: 30, agility: 30, harmony: 60, chaos: 5 },
          traits: [],
          generation: 1,
          inbreeding: 0,
        } as Genome,
      },
      {
        speciesKey: "aqua_slime",
        genome: {
          primary: "water",
          secondary: null,
          stats: { qi: 40, guard: 30, agility: 30, harmony: 55, chaos: 5 },
          traits: [],
          generation: 1,
          inbreeding: 0,
        } as Genome,
      },
    ];

    const report = calculateEcosystemHealth(diverseCreatures, 12);
    expect(report.speciesDiversity).toBe(3);
    expect(report.overallHarmony).toBeGreaterThanOrEqual(50);
    expect(report.degradationMultiplier).toBeGreaterThan(1.0);
    expect(report.notesVi.some((n) => n.includes("đa dạng"))).toBe(true);
  });

  it("generates pure raw materials for pure creatures and compound materials for hybrids", () => {
    // 1. Pure Wood creature -> ancient_wood
    const pureWoodDrop = getCreatureDrop({
      primary: "wood",
      secondary: null,
      stats: { qi: 20, guard: 20, agility: 20, harmony: 20, chaos: 10 },
      traits: [],
      generation: 1,
      inbreeding: 0,
    });
    expect(pureWoodDrop.itemKey).toBe("ancient_wood");
    expect(pureWoodDrop.isHybridDrop).toBe(false);

    // 2. Hybrid Metal + Fire -> alloy_ingot
    const hybridAlloyDrop = getCreatureDrop({
      primary: "metal",
      secondary: "fire",
      stats: { qi: 50, guard: 40, agility: 20, harmony: 30, chaos: 10 },
      traits: [],
      generation: 2,
      inbreeding: 0,
    });
    expect(hybridAlloyDrop.itemKey).toBe("alloy_ingot");
    expect(hybridAlloyDrop.isHybridDrop).toBe(true);

    // 3. Hybrid Water + Wood -> dew_essence
    const hybridDewDrop = getCreatureDrop({
      primary: "water",
      secondary: "wood",
      stats: { qi: 80, guard: 20, agility: 30, harmony: 40, chaos: 5 },
      traits: [],
      generation: 2,
      inbreeding: 0,
    });
    expect(hybridDewDrop.itemKey).toBe("dew_essence");
    expect(hybridDewDrop.qty).toBe(2); // High Qi bonus
  });
});
