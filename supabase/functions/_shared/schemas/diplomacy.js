import { z } from "zod";
export const AllianceDiplomacyStatusSchema = z.enum([
    "neutral",
    "allied",
    "hostile",
    "pending_alliance",
]);
export const AllianceDiplomacyActionSchema = z.enum([
    "propose_alliance",
    "declare_hostility",
    "declare_neutral",
]);
export const ProposeDiplomacyInputSchema = z.object({
    myAllianceId: z.string().uuid(),
    targetAllianceId: z.string().uuid(),
    action: AllianceDiplomacyActionSchema,
});
export const RespondDiplomacyInputSchema = z.object({
    myAllianceId: z.string().uuid(),
    targetAllianceId: z.string().uuid(),
    accept: z.boolean(),
});
export const AllianceDiplomacyRecordSchema = z.object({
    id: z.string().uuid(),
    allianceA: z.string().uuid(),
    allianceB: z.string().uuid(),
    status: AllianceDiplomacyStatusSchema,
    proposedByAllianceId: z.string().uuid().nullable().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});
//# sourceMappingURL=diplomacy.js.map