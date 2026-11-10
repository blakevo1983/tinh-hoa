import type { Genome } from "../schemas/genome.js";

export interface EcosystemCreatureInfo {
  speciesKey: string;
  genome: Genome;
  tileX?: number;
  tileY?: number;
}

export interface EcosystemHealthReport {
  totalCreatures: number;
  speciesDiversity: number; // distinct species count
  overallHarmony: number; // average harmony
  degradationMultiplier: number; // 0.5 to 1.2 (affects resource rates)
  isOvercrowded: boolean;
  notesVi: string[];
}

/**
 * Pure function: calculates ecosystem health, biodiversity and tile degradation according to GDD 5.
 * A single dominant overpopulated species causes ecological degradation (yield penalty).
 * High biodiversity and harmony boost planetary ecosystem vitality.
 */
export function calculateEcosystemHealth(
  creatures: EcosystemCreatureInfo[],
  gridSize: number = 12,
): EcosystemHealthReport {
  if (creatures.length === 0) {
    return {
      totalCreatures: 0,
      speciesDiversity: 0,
      overallHarmony: 0,
      degradationMultiplier: 1.0,
      isOvercrowded: false,
      notesVi: ["Hành tinh chưa có sinh vật cư ngụ."],
    };
  }

  const speciesCountMap = new Map<string, number>();
  let totalHarmony = 0;

  for (const c of creatures) {
    speciesCountMap.set(c.speciesKey, (speciesCountMap.get(c.speciesKey) || 0) + 1);
    totalHarmony += c.genome.stats.harmony;
  }

  const totalCreatures = creatures.length;
  const speciesDiversity = speciesCountMap.size;
  const overallHarmony = Math.round(totalHarmony / totalCreatures);
  const notesVi: string[] = [];

  // Max comfortable capacity based on total grid cells
  const totalCells = gridSize * gridSize;
  const maxSafeDensity = Math.max(10, Math.floor(totalCells * 0.1)); // 10% of tiles
  const isOvercrowded = totalCreatures > maxSafeDensity;

  let degradationMultiplier = 1.0;

  // 1. Monoculture / Overcrowded penalty
  // If one single species accounts for more than 70% of total population (when total >= 5)
  let maxSingleSpeciesRatio = 0;
  for (const count of speciesCountMap.values()) {
    const ratio = count / totalCreatures;
    if (ratio > maxSingleSpeciesRatio) {
      maxSingleSpeciesRatio = ratio;
    }
  }

  if (totalCreatures >= 5 && maxSingleSpeciesRatio >= 0.7) {
    degradationMultiplier -= 0.2; // -20% yield from monoculture stress
    notesVi.push("Độc canh sinh vật: một loài chiếm ưu thế áp đảo gây suy thoái ô sinh thái.");
  }

  if (isOvercrowded) {
    degradationMultiplier -= 0.15; // -15% from general overcrowding
    notesVi.push("Mật độ sinh vật quá tải làm cạn kiệt linh khí cục bộ.");
  }

  // 2. Biodiversity and harmony bonus
  if (speciesDiversity >= 3 && overallHarmony >= 30) {
    degradationMultiplier += 0.15; // +15% vitality bonus
    notesVi.push("Hệ sinh thái đa dạng và hài hòa giúp gia tăng sản lượng thu thập.");
  }

  // Clamp degradationMultiplier between 0.5 (heavy penalty) and 1.25 (lush vitality)
  degradationMultiplier = Math.max(
    0.5,
    Math.min(1.25, Math.round(degradationMultiplier * 100) / 100),
  );

  return {
    totalCreatures,
    speciesDiversity,
    overallHarmony,
    degradationMultiplier,
    isOvercrowded,
    notesVi,
  };
}
