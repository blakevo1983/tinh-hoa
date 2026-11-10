import { z } from "zod";
export declare const PartyActivityTypeSchema: z.ZodEnum<["expedition", "celestial_boss", "duo_quest"]>;
export type PartyActivityType = z.infer<typeof PartyActivityTypeSchema>;
export declare const PartyRewardDistributionSchema: z.ZodEnum<["personal", "equal", "leader"]>;
export type PartyRewardDistribution = z.infer<typeof PartyRewardDistributionSchema>;
export declare const PartyStatusSchema: z.ZodEnum<["open", "active", "completed", "expired"]>;
export type PartyStatus = z.infer<typeof PartyStatusSchema>;
export declare const PartySchema: z.ZodObject<{
    id: z.ZodString;
    leaderId: z.ZodString;
    title: z.ZodString;
    activityType: z.ZodEnum<["expedition", "celestial_boss", "duo_quest"]>;
    maxMembers: z.ZodDefault<z.ZodNumber>;
    rewardDistribution: z.ZodEnum<["personal", "equal", "leader"]>;
    status: z.ZodEnum<["open", "active", "completed", "expired"]>;
    expiresAt: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "open" | "active" | "completed" | "expired";
    id: string;
    leaderId: string;
    createdAt: string;
    title: string;
    activityType: "expedition" | "celestial_boss" | "duo_quest";
    maxMembers: number;
    rewardDistribution: "equal" | "leader" | "personal";
    expiresAt: string;
}, {
    status: "open" | "active" | "completed" | "expired";
    id: string;
    leaderId: string;
    createdAt: string;
    title: string;
    activityType: "expedition" | "celestial_boss" | "duo_quest";
    rewardDistribution: "equal" | "leader" | "personal";
    expiresAt: string;
    maxMembers?: number | undefined;
}>;
export type Party = z.infer<typeof PartySchema>;
export declare const PartyMemberSchema: z.ZodObject<{
    partyId: z.ZodString;
    userId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    contributionScore: z.ZodDefault<z.ZodNumber>;
    joinedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    joinedAt: string;
    partyId: string;
    contributionScore: number;
    displayName?: string | undefined;
}, {
    userId: string;
    joinedAt: string;
    partyId: string;
    displayName?: string | undefined;
    contributionScore?: number | undefined;
}>;
export type PartyMember = z.infer<typeof PartyMemberSchema>;
export declare const PartyCreateRequestSchema: z.ZodObject<{
    title: z.ZodString;
    activityType: z.ZodDefault<z.ZodEnum<["expedition", "celestial_boss", "duo_quest"]>>;
    maxMembers: z.ZodDefault<z.ZodNumber>;
    rewardDistribution: z.ZodDefault<z.ZodEnum<["personal", "equal", "leader"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    activityType: "expedition" | "celestial_boss" | "duo_quest";
    maxMembers: number;
    rewardDistribution: "equal" | "leader" | "personal";
}, {
    title: string;
    activityType?: "expedition" | "celestial_boss" | "duo_quest" | undefined;
    maxMembers?: number | undefined;
    rewardDistribution?: "equal" | "leader" | "personal" | undefined;
}>;
export type PartyCreateRequest = z.infer<typeof PartyCreateRequestSchema>;
//# sourceMappingURL=party.d.ts.map