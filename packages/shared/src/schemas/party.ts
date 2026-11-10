import { z } from "zod";

export const PartyActivityTypeSchema = z.enum(["expedition", "celestial_boss", "duo_quest"]);
export type PartyActivityType = z.infer<typeof PartyActivityTypeSchema>;

export const PartyRewardDistributionSchema = z.enum(["personal", "equal", "leader"]);
export type PartyRewardDistribution = z.infer<typeof PartyRewardDistributionSchema>;

export const PartyStatusSchema = z.enum(["open", "active", "completed", "expired"]);
export type PartyStatus = z.infer<typeof PartyStatusSchema>;

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
export type Party = z.infer<typeof PartySchema>;

export const PartyMemberSchema = z.object({
  partyId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().optional(),
  contributionScore: z.number().int().min(0).default(0),
  joinedAt: z.string().datetime(),
});
export type PartyMember = z.infer<typeof PartyMemberSchema>;

export const PartyCreateRequestSchema = z.object({
  title: z.string().min(3).max(50),
  activityType: PartyActivityTypeSchema.default("expedition"),
  maxMembers: z.number().int().min(2).max(5).default(5),
  rewardDistribution: PartyRewardDistributionSchema.default("personal"),
});
export type PartyCreateRequest = z.infer<typeof PartyCreateRequestSchema>;
