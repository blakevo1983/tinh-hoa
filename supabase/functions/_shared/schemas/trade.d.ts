import { z } from "zod";
export declare const NpcTradeInputSchema: z.ZodEffects<z.ZodObject<{
    planetId: z.ZodString;
    npcPlanetId: z.ZodString;
    offerResource: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    offerAmount: z.ZodNumber;
    targetResource: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
}, "strip", z.ZodTypeAny, {
    planetId: string;
    npcPlanetId: string;
    offerResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    offerAmount: number;
    targetResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
}, {
    planetId: string;
    npcPlanetId: string;
    offerResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    offerAmount: number;
    targetResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
}>, {
    planetId: string;
    npcPlanetId: string;
    offerResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    offerAmount: number;
    targetResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
}, {
    planetId: string;
    npcPlanetId: string;
    offerResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    offerAmount: number;
    targetResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
}>;
export type NpcTradeInput = z.infer<typeof NpcTradeInputSchema>;
export declare const NpcTradeResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    offered: z.ZodNumber;
    received: z.ZodNumber;
    effectiveRate: z.ZodNumber;
    dailyTotalTraded: z.ZodNumber;
    dailyCapRemaining: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    received: number;
    effectiveRate: number;
    success: boolean;
    offered: number;
    dailyTotalTraded: number;
    dailyCapRemaining: number;
}, {
    received: number;
    effectiveRate: number;
    success: boolean;
    offered: number;
    dailyTotalTraded: number;
    dailyCapRemaining: number;
}>;
export type NpcTradeResult = z.infer<typeof NpcTradeResultSchema>;
//# sourceMappingURL=trade.d.ts.map