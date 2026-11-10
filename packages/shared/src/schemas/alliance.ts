import { z } from "zod";
import { ElementKeySchema } from "./element.js";

export const AllianceRoleSchema = z.enum(["leader", "officer", "member"]);
export type AllianceRole = z.infer<typeof AllianceRoleSchema>;

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
export type Alliance = z.infer<typeof AllianceSchema>;

export const AllianceMemberSchema = z.object({
  allianceId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().optional(),
  role: AllianceRoleSchema,
  joinedAt: z.string().datetime(),
  dailyWithdrawnAmount: z.number().int().default(0),
});
export type AllianceMember = z.infer<typeof AllianceMemberSchema>;

export const AllianceCreateRequestSchema = z.object({
  name: z.string().min(3).max(30),
  tag: z.string().min(2).max(6),
  description: z.string().max(300).optional(),
});
export type AllianceCreateRequest = z.infer<typeof AllianceCreateRequestSchema>;

export const AllianceDepositRequestSchema = z.object({
  allianceId: z.string().uuid(),
  planetId: z.string().uuid(),
  resourceKey: ElementKeySchema,
  amount: z.number().int().positive(),
});
export type AllianceDepositRequest = z.infer<typeof AllianceDepositRequestSchema>;

export const AllianceWithdrawRequestSchema = z.object({
  allianceId: z.string().uuid(),
  planetId: z.string().uuid(),
  resourceKey: ElementKeySchema,
  amount: z.number().int().positive(),
});
export type AllianceWithdrawRequest = z.infer<typeof AllianceWithdrawRequestSchema>;
