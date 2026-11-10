import { z } from "zod";
export declare const NpcPlanetPersonalitySchema: z.ZodEnum<["aggressive", "mercantile", "reclusive", "scientific"]>;
export type NpcPlanetPersonality = z.infer<typeof NpcPlanetPersonalitySchema>;
export declare const NpcPlanetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    personality: z.ZodEnum<["aggressive", "mercantile", "reclusive", "scientific"]>;
    coordX: z.ZodNumber;
    coordY: z.ZodNumber;
    discoveredMinStage: z.ZodDefault<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    baseRewards: z.ZodRecord<z.ZodString, z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    personality: "aggressive" | "mercantile" | "reclusive" | "scientific";
    coordX: number;
    coordY: number;
    discoveredMinStage: number;
    baseRewards: Record<string, number>;
    description?: string | undefined;
    createdAt?: string | undefined;
}, {
    id: string;
    name: string;
    element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    personality: "aggressive" | "mercantile" | "reclusive" | "scientific";
    coordX: number;
    coordY: number;
    baseRewards: Record<string, number>;
    discoveredMinStage?: number | undefined;
    description?: string | undefined;
    createdAt?: string | undefined;
}>;
export type NpcPlanet = z.infer<typeof NpcPlanetSchema>;
export declare const PlanetExpeditionStatusSchema: z.ZodEnum<["in_progress", "completed", "cancelled"]>;
export type PlanetExpeditionStatus = z.infer<typeof PlanetExpeditionStatusSchema>;
export declare const PlanetExpeditionSchema: z.ZodObject<{
    id: z.ZodString;
    planetId: z.ZodString;
    userId: z.ZodString;
    targetNpcId: z.ZodString;
    status: z.ZodEnum<["in_progress", "completed", "cancelled"]>;
    costResource: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    costAmount: z.ZodNumber;
    rewards: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    finishAt: z.ZodString;
    settledAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "in_progress" | "completed" | "cancelled";
    planetId: string;
    userId: string;
    targetNpcId: string;
    costResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    costAmount: number;
    finishAt: string;
    createdAt?: string | undefined;
    rewards?: Record<string, number> | null | undefined;
    settledAt?: string | null | undefined;
}, {
    id: string;
    status: "in_progress" | "completed" | "cancelled";
    planetId: string;
    userId: string;
    targetNpcId: string;
    costResource: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    costAmount: number;
    finishAt: string;
    createdAt?: string | undefined;
    rewards?: Record<string, number> | null | undefined;
    settledAt?: string | null | undefined;
}>;
export type PlanetExpedition = z.infer<typeof PlanetExpeditionSchema>;
export declare const StartExpeditionInputSchema: z.ZodObject<{
    planetId: z.ZodString;
    targetNpcId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    planetId: string;
    targetNpcId: string;
}, {
    planetId: string;
    targetNpcId: string;
}>;
export type StartExpeditionInput = z.infer<typeof StartExpeditionInputSchema>;
//# sourceMappingURL=expedition.d.ts.map