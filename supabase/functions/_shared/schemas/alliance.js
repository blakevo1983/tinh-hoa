import { z } from "zod";
import { ElementKeySchema } from "./element.js";
export const AllianceRoleSchema = z.enum(["leader", "officer", "member"]);
export const AllianceSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(3).max(30),
    tag: z.string().min(2).max(6),
    leaderId: z.string().uuid(),
    level: z.number().int().min(1).default(1),
    memberCap: z.number().int().min(1).default(10),
    description: z.string().max(300).nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const AllianceMemberSchema = z.object({
    allianceId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string().optional(),
    role: AllianceRoleSchema,
    joinedAt: z.string().datetime(),
    dailyWithdrawnAmount: z.number().int().default(0),
});
export const AllianceCreateRequestSchema = z.object({
    name: z.string().min(3).max(30),
    tag: z.string().min(2).max(6),
    description: z.string().max(300).optional(),
});
export const AllianceDepositRequestSchema = z.object({
    allianceId: z.string().uuid(),
    planetId: z.string().uuid(),
    resourceKey: ElementKeySchema,
    amount: z.number().int().positive(),
});
export const AllianceWithdrawRequestSchema = z.object({
    allianceId: z.string().uuid(),
    planetId: z.string().uuid(),
    resourceKey: ElementKeySchema,
    amount: z.number().int().positive(),
});
//# sourceMappingURL=alliance.js.map