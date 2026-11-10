import { describe, it, expect } from "vitest";
import { calculateAllianceElementalBuff } from "./elemental-buff.js";
import {
  AllianceSchema,
  AllianceMemberSchema,
  AllianceCreateRequestSchema,
} from "../schemas/alliance.js";
import { PartySchema, PartyCreateRequestSchema } from "../schemas/party.js";

describe("Alliance Elemental Buff (T4.5)", () => {
  it("returns zero bonus for empty alliance", () => {
    const res = calculateAllianceElementalBuff([]);
    expect(res.productionBonusPct).toBe(0);
    expect(res.hasFiveElementsHarmony).toBe(false);
  });

  it("calculates generative pairs bonus (Metal + Water + Wood)", () => {
    // Metal produces Water (+3%), Water produces Wood (+3%) -> 2 generative pairs = +6%
    const res = calculateAllianceElementalBuff(["metal", "water", "wood"]);
    expect(res.generativePairsCount).toBe(2);
    expect(res.productionBonusPct).toBe(6);
    expect(res.hasFiveElementsHarmony).toBe(false);
  });

  it("activates Five Elements Harmony when all 5 core elements are present", () => {
    const allFive = ["metal", "wood", "water", "fire", "earth"] as const;
    const res = calculateAllianceElementalBuff(allFive);
    expect(res.hasFiveElementsHarmony).toBe(true);
    // 5 generative pairs (Kim->Thủy, Thủy->Mộc, Mộc->Hỏa, Hỏa->Thổ, Thổ->Kim) = 5 * 3 = 15% + 10% bonus = 25%
    expect(res.productionBonusPct).toBe(25);
    expect(res.descriptionVi).toContain("Ngũ Hành Đại Hòa Hợp");
  });
});

describe("Alliance & Party Schemas (T4.5)", () => {
  const validUuid = "11111111-2222-3333-4444-555555555555";

  it("validates Alliance and Member schemas", () => {
    expect(
      AllianceCreateRequestSchema.safeParse({
        name: "Thiên Hà Tinh Tú",
        tag: "THTT",
        description: "Liên minh khai phá các tinh cầu phương đông",
      }).success,
    ).toBe(true);

    expect(
      AllianceSchema.safeParse({
        id: validUuid,
        name: "Thiên Hà Tinh Tú",
        tag: "THTT",
        leaderId: validUuid,
        level: 1,
        memberCap: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);

    expect(
      AllianceMemberSchema.safeParse({
        allianceId: validUuid,
        userId: validUuid,
        role: "officer",
        joinedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("validates Party schemas", () => {
    expect(
      PartyCreateRequestSchema.safeParse({
        title: "Săn Thiên Thể Cổ Đại",
        activityType: "celestial_boss",
        maxMembers: 4,
        rewardDistribution: "personal",
      }).success,
    ).toBe(true);

    expect(
      PartySchema.safeParse({
        id: validUuid,
        leaderId: validUuid,
        title: "Săn Thiên Thể Cổ Đại",
        activityType: "celestial_boss",
        maxMembers: 4,
        rewardDistribution: "personal",
        status: "open",
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});
