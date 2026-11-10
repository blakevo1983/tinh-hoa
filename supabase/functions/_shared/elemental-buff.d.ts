import type { ElementKey } from "../config/elements.js";
export interface AllianceBuffResult {
    readonly uniqueElementsCount: number;
    readonly generativePairsCount: number;
    readonly productionBonusPct: number;
    readonly hasFiveElementsHarmony: boolean;
    readonly descriptionVi: string;
}
/**
 * Pure function to calculate alliance elemental synergy buffs (GDD 05 & T4.5).
 * Rewards alliances having diverse and mutually generative elemental members.
 */
export declare function calculateAllianceElementalBuff(memberElements: readonly ElementKey[]): AllianceBuffResult;
//# sourceMappingURL=elemental-buff.d.ts.map