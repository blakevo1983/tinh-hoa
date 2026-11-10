import type { ElementKey } from "../config/elements.js";
import type { NpcPlanetPersonality } from "../schemas/expedition.js";
export interface NpcExchangeRateResult {
    readonly effectiveRate: number;
    readonly baseSpread: number;
    readonly elementalAffinityMultiplier: number;
    readonly descriptionVi: string;
}
/**
 * Pure function to calculate NPC exchange rate with mathematical anti-arbitrage guarantee.
 * Conforms to GDD 10, Roadmap P5 and Security review specs.
 */
export declare function calculateNpcExchangeRate(fromElement: ElementKey, toElement: ElementKey, personality: NpcPlanetPersonality, npcElement: ElementKey): NpcExchangeRateResult;
/**
 * Calculates received resource units from an NPC exchange
 */
export declare function calculateNpcTradeOutput(offerAmount: number, fromElement: ElementKey, toElement: ElementKey, personality: NpcPlanetPersonality, npcElement: ElementKey): number;
//# sourceMappingURL=npc-trade.d.ts.map