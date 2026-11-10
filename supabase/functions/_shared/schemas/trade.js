import { z } from "zod";
import { ELEMENT_KEYS } from "../config/elements.js";
export const NpcTradeInputSchema = z
    .object({
    planetId: z.string().uuid(),
    npcPlanetId: z.string().uuid(),
    offerResource: z.enum(ELEMENT_KEYS),
    offerAmount: z.number().int().positive().max(2000),
    targetResource: z.enum(ELEMENT_KEYS),
})
    .refine((data) => data.offerResource !== data.targetResource, {
    message: "Cannot exchange the same resource",
    path: ["targetResource"],
});
export const NpcTradeResultSchema = z.object({
    success: z.boolean(),
    offered: z.number().int().positive(),
    received: z.number().int().positive(),
    effectiveRate: z.number().positive(),
    dailyTotalTraded: z.number().int().nonnegative(),
    dailyCapRemaining: z.number().int().nonnegative(),
});
//# sourceMappingURL=trade.js.map