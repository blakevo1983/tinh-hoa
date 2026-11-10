import { z } from "zod";
export const PartyActivityTypeSchema = z.enum(["expedition", "celestial_boss", "duo_quest"]);
export const PartyRewardDistributionSchema = z.enum(["personal", "equal", "leader"]);
export const PartyStatusSchema = z.enum(["open", "active", "completed", "expired"]);
export const PartySchema = z.object({
    id: z.string().uuid(),
    leaderId: z.string().uuid(),
    title: z.string().min(3).max(50),
    activityType: PartyActivityTypeSchema,
    maxMembers: z.number().int().min(2).max(5).default(5),
    rewardDistribution: PartyRewardDistributionSchema,
    status: PartyStatusSchema,
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
});
export const PartyMemberSchema = z.object({
    partyId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string().optional(),
    contributionScore: z.number().int().min(0).default(0),
    joinedAt: z.string().datetime(),
});
export const PartyCreateRequestSchema = z.object({
    title: z.string().min(3).max(50),
    activityType: PartyActivityTypeSchema.default("expedition"),
    maxMembers: z.number().int().min(2).max(5).default(5),
    rewardDistribution: PartyRewardDistributionSchema.default("personal"),
});
//# sourceMappingURL=party.js.map