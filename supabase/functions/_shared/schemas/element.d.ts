import { z } from "zod";
export declare const ElementKeySchema: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
export declare const StatKeySchema: z.ZodEnum<["qi", "guard", "agility", "harmony", "chaos"]>;
export declare const StatsSchema: z.ZodObject<{
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
export type Stats = z.infer<typeof StatsSchema>;
//# sourceMappingURL=element.d.ts.map