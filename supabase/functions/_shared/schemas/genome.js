import { z } from "zod";
import { ElementKeySchema, StatsSchema } from "./element.js";
import { GAME_LIMITS } from "../config/limits.js";
/**
 * Helper pure function to strictly clamp all 5 stats within game limits [1..100].
 */
export function clampStats(stats) {
    const clamp = (val) => Math.max(GAME_LIMITS.minStatValue, Math.min(GAME_LIMITS.maxStatValue, Math.round(val)));
    return {
        qi: clamp(stats.qi),
        guard: clamp(stats.guard),
        agility: clamp(stats.agility),
        harmony: clamp(stats.harmony),
        chaos: clamp(stats.chaos),
    };
}
/**
 * Shared Genome schema for creatures (full genetic profile)
 */
export const GenomeSchema = z.object({
    primary: ElementKeySchema,
    secondary: ElementKeySchema.nullable().default(null),
    stats: StatsSchema,
    traits: z.array(z.string().min(1).max(32)).max(GAME_LIMITS.maxTraitsPerCreature).default([]),
    generation: z.number().int().min(1).default(1),
    inbreeding: z.number().min(0).default(0),
});
/**
 * Mini Genome schema for crafted or catalyst items (GDD 6)
 */
export const ItemGenomeSchema = z.object({
    primary: ElementKeySchema,
    secondary: ElementKeySchema.nullable().default(null),
    stats: StatsSchema,
    traits: z.array(z.string().min(1).max(32)).max(GAME_LIMITS.maxTraitsPerCreature).default([]),
});
//# sourceMappingURL=genome.js.map