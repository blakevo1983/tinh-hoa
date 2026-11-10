import { type ElementKey } from "./elements.js";
export declare const BUILDING_KINDS: readonly ["harvester", "storage", "harmony_pool", "crafting_furnace"];
export type BuildingKind = (typeof BUILDING_KINDS)[number];
export interface BuildingCost {
    resourceKey: ElementKey;
    amount: number;
}
export interface BuildingDefinition {
    kind: BuildingKind;
    nameVi: string;
    nameEn: string;
    descriptionVi: string;
    baseBuildTimeSec: number;
    baseCost: number;
}
export declare const BUILDING_DEFINITIONS: Record<BuildingKind, BuildingDefinition>;
/**
 * Calculates building construction or upgrade cost based on level.
 */
export declare function getBuildingCost(kind: BuildingKind, level: number, primaryElement: ElementKey): BuildingCost;
/**
 * Calculates build/upgrade duration in seconds.
 */
export declare function getBuildingTimeSec(kind: BuildingKind, level: number): number;
/**
 * Calculates capacity bonus provided by storage building.
 * Level 1: +500 cap, Level 2: +1000 cap, etc.
 */
export declare function getStorageCapBonus(level: number): number;
/**
 * Calculates tile production rate per second based on richness, building level,
 * and cardinal neighbor affinity (GDD 3.3).
 *
 * Base rate = 0.2 * richness * level
 * Neighbor modifiers:
 * - Generative neighbor (neighbor generates this tile's element): +20% (+0.2)
 * - Overcoming neighbor (neighbor overcomes this tile's element): -33% (-0.33)
 * - Overcome neighbor (this tile's element overcomes neighbor): +15% (+0.15)
 */
export declare function calculateHarvesterProductionRate(tileElement: ElementKey, richness: number, level: number, neighborElements: readonly ElementKey[]): number;
//# sourceMappingURL=buildings.d.ts.map