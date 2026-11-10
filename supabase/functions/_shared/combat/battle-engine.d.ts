import type { ElementKey } from "../config/elements.js";
import type { BattleResult, CombatFighter } from "../schemas/combat.js";
/**
 * Calculates combat effectiveness multiplier between attacker and defender elements.
 * Generative & Destructive elemental advantages per GDD 10.
 */
export declare function getCombatElementalMultiplier(attackerElement: ElementKey, defenderElement: ElementKey): number;
/**
 * Pure function: Simulates turn-based auto combat between two teams.
 * Max 50 rounds guaranteed termination. Deterministic output based on seed.
 */
export declare function simulateBattle(attackerTeam: readonly CombatFighter[], defenderTeam: readonly CombatFighter[], seed: number): BattleResult;
//# sourceMappingURL=battle-engine.d.ts.map