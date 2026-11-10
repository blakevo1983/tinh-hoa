import { z } from "zod";
export declare const AllianceDiplomacyStatusSchema: z.ZodEnum<["neutral", "allied", "hostile", "pending_alliance"]>;
export type AllianceDiplomacyStatus = z.infer<typeof AllianceDiplomacyStatusSchema>;
export declare const AllianceDiplomacyActionSchema: z.ZodEnum<["propose_alliance", "declare_hostility", "declare_neutral"]>;
export type AllianceDiplomacyAction = z.infer<typeof AllianceDiplomacyActionSchema>;
export declare const ProposeDiplomacyInputSchema: z.ZodObject<{
    myAllianceId: z.ZodString;
    targetAllianceId: z.ZodString;
    action: z.ZodEnum<["propose_alliance", "declare_hostility", "declare_neutral"]>;
}, "strip", z.ZodTypeAny, {
    myAllianceId: string;
    targetAllianceId: string;
    action: "propose_alliance" | "declare_hostility" | "declare_neutral";
}, {
    myAllianceId: string;
    targetAllianceId: string;
    action: "propose_alliance" | "declare_hostility" | "declare_neutral";
}>;
export type ProposeDiplomacyInput = z.infer<typeof ProposeDiplomacyInputSchema>;
export declare const RespondDiplomacyInputSchema: z.ZodObject<{
    myAllianceId: z.ZodString;
    targetAllianceId: z.ZodString;
    accept: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    myAllianceId: string;
    targetAllianceId: string;
    accept: boolean;
}, {
    myAllianceId: string;
    targetAllianceId: string;
    accept: boolean;
}>;
export type RespondDiplomacyInput = z.infer<typeof RespondDiplomacyInputSchema>;
export declare const AllianceDiplomacyRecordSchema: z.ZodObject<{
    id: z.ZodString;
    allianceA: z.ZodString;
    allianceB: z.ZodString;
    status: z.ZodEnum<["neutral", "allied", "hostile", "pending_alliance"]>;
    proposedByAllianceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "neutral" | "allied" | "hostile" | "pending_alliance";
    allianceA: string;
    allianceB: string;
    createdAt?: string | undefined;
    proposedByAllianceId?: string | null | undefined;
    updatedAt?: string | undefined;
}, {
    id: string;
    status: "neutral" | "allied" | "hostile" | "pending_alliance";
    allianceA: string;
    allianceB: string;
    createdAt?: string | undefined;
    proposedByAllianceId?: string | null | undefined;
    updatedAt?: string | undefined;
}>;
export type AllianceDiplomacyRecord = z.infer<typeof AllianceDiplomacyRecordSchema>;
//# sourceMappingURL=diplomacy.d.ts.map