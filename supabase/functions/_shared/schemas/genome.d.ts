import { z } from "zod";
import { type Stats } from "./element.js";
/**
 * Helper pure function to strictly clamp all 5 stats within game limits [1..100].
 */
export declare function clampStats(stats: Stats): Stats;
/**
 * Shared Genome schema for creatures (full genetic profile)
 */
export declare const GenomeSchema: z.ZodObject<{
    primary: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    secondary: z.ZodDefault<z.ZodNullable<z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>>>;
    stats: z.ZodObject<{
        qi: z.ZodNumber;
        guard: z.ZodNumber;
        agility: z.ZodNumber;
        harmony: z.ZodNumber;
        chaos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }>;
    traits: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    generation: z.ZodDefault<z.ZodNumber>;
    inbreeding: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    primary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    secondary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null;
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    traits: string[];
    generation: number;
    inbreeding: number;
}, {
    primary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    secondary?: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null | undefined;
    traits?: string[] | undefined;
    generation?: number | undefined;
    inbreeding?: number | undefined;
}>;
export type Genome = z.infer<typeof GenomeSchema>;
/**
 * Mini Genome schema for crafted or catalyst items (GDD 6)
 */
export declare const ItemGenomeSchema: z.ZodObject<{
    primary: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    secondary: z.ZodDefault<z.ZodNullable<z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>>>;
    stats: z.ZodObject<{
        qi: z.ZodNumber;
        guard: z.ZodNumber;
        agility: z.ZodNumber;
        harmony: z.ZodNumber;
        chaos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }>;
    traits: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    primary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    secondary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null;
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    traits: string[];
}, {
    primary: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    secondary?: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null | undefined;
    traits?: string[] | undefined;
}>;
export type ItemGenome = z.infer<typeof ItemGenomeSchema>;
export type { Stats };
//# sourceMappingURL=genome.d.ts.map