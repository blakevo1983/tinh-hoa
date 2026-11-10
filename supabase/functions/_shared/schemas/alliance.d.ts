import { z } from "zod";
export declare const AllianceRoleSchema: z.ZodEnum<["leader", "officer", "member"]>;
export type AllianceRole = z.infer<typeof AllianceRoleSchema>;
export declare const AllianceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    tag: z.ZodString;
    leaderId: z.ZodString;
    level: z.ZodDefault<z.ZodNumber>;
    memberCap: z.ZodDefault<z.ZodNumber>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    tag: string;
    id: string;
    leaderId: string;
    level: number;
    memberCap: number;
    createdAt: string;
    updatedAt: string;
    description?: string | null | undefined;
}, {
    name: string;
    tag: string;
    id: string;
    leaderId: string;
    createdAt: string;
    updatedAt: string;
    description?: string | null | undefined;
    level?: number | undefined;
    memberCap?: number | undefined;
}>;
export type Alliance = z.infer<typeof AllianceSchema>;
export declare const AllianceMemberSchema: z.ZodObject<{
    allianceId: z.ZodString;
    userId: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["leader", "officer", "member"]>;
    joinedAt: z.ZodString;
    dailyWithdrawnAmount: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    allianceId: string;
    userId: string;
    role: "leader" | "officer" | "member";
    joinedAt: string;
    dailyWithdrawnAmount: number;
    displayName?: string | undefined;
}, {
    allianceId: string;
    userId: string;
    role: "leader" | "officer" | "member";
    joinedAt: string;
    displayName?: string | undefined;
    dailyWithdrawnAmount?: number | undefined;
}>;
export type AllianceMember = z.infer<typeof AllianceMemberSchema>;
export declare const AllianceCreateRequestSchema: z.ZodObject<{
    name: z.ZodString;
    tag: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tag: string;
    description?: string | undefined;
}, {
    name: string;
    tag: string;
    description?: string | undefined;
}>;
export type AllianceCreateRequest = z.infer<typeof AllianceCreateRequestSchema>;
export declare const AllianceDepositRequestSchema: z.ZodObject<{
    allianceId: z.ZodString;
    planetId: z.ZodString;
    resourceKey: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    allianceId: string;
    planetId: string;
    resourceKey: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    amount: number;
}, {
    allianceId: string;
    planetId: string;
    resourceKey: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    amount: number;
}>;
export type AllianceDepositRequest = z.infer<typeof AllianceDepositRequestSchema>;
export declare const AllianceWithdrawRequestSchema: z.ZodObject<{
    allianceId: z.ZodString;
    planetId: z.ZodString;
    resourceKey: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    allianceId: string;
    planetId: string;
    resourceKey: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    amount: number;
}, {
    allianceId: string;
    planetId: string;
    resourceKey: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    amount: number;
}>;
export type AllianceWithdrawRequest = z.infer<typeof AllianceWithdrawRequestSchema>;
//# sourceMappingURL=alliance.d.ts.map