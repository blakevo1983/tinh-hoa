import { z } from "zod";
import { ELEMENT_KEYS } from "../config/elements.js";
export const NpcPlanetPersonalitySchema = z.enum([
    "aggressive",
    "mercantile",
    "reclusive",
    "scientific",
]);
export const NpcPlanetSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(40),
    element: z.enum(ELEMENT_KEYS),
    personality: NpcPlanetPersonalitySchema,
    coordX: z.number().int(),
    coordY: z.number().int(),
    discoveredMinStage: z.number().int().min(1).max(5).default(4),
    description: z.string().optional(),
    baseRewards: z.record(z.string(), z.number().int().nonnegative()),
    createdAt: z.string().datetime().optional(),
});
export const PlanetExpeditionStatusSchema = z.enum(["in_progress", "completed", "cancelled"]);
export const PlanetExpeditionSchema = z.object({
    id: z.string().uuid(),
    planetId: z.string().uuid(),
    userId: z.string().uuid(),
    targetNpcId: z.string().uuid(),
    status: PlanetExpeditionStatusSchema,
    costResource: z.enum(ELEMENT_KEYS),
    costAmount: z.number().int().positive(),
    rewards: z.record(z.string(), z.number().int().nonnegative()).nullable().optional(),
    finishAt: z.string().datetime(),
    settledAt: z.string().datetime().nullable().optional(),
    createdAt: z.string().datetime().optional(),
});
export const StartExpeditionInputSchema = z.object({
    planetId: z.string().uuid(),
    targetNpcId: z.string().uuid(),
});
//# sourceMappingURL=expedition.js.map