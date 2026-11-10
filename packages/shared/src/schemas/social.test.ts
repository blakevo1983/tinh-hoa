import { describe, it, expect } from "vitest";
import {
  PublicProfileSchema,
  FriendshipSchema,
  FriendRequestCommandSchema,
  FriendRespondCommandSchema,
  BlockUserCommandSchema,
} from "./social.js";

describe("Social Schemas (T3.1)", () => {
  const validUuid1 = "11111111-2222-3333-4444-555555555555";
  const validUuid2 = "22222222-3333-4444-5555-666666666666";

  it("validates PublicProfile correctly", () => {
    const valid = {
      id: validUuid1,
      displayName: "TinhHoaVoyager",
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    expect(PublicProfileSchema.safeParse(valid).success).toBe(true);

    // Reject too short or too long displayName
    expect(PublicProfileSchema.safeParse({ ...valid, displayName: "ab" }).success).toBe(false);
    expect(
      PublicProfileSchema.safeParse({
        ...valid,
        displayName: "this_name_is_way_too_long_for_game",
      }).success,
    ).toBe(false);
  });

  it("validates Friendship statuses", () => {
    const valid = {
      userId: validUuid1,
      friendId: validUuid2,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(FriendshipSchema.safeParse(valid).success).toBe(true);

    expect(FriendshipSchema.safeParse({ ...valid, status: "accepted" }).success).toBe(true);
    expect(FriendshipSchema.safeParse({ ...valid, status: "rejected" }).success).toBe(true);
    expect(FriendshipSchema.safeParse({ ...valid, status: "invalid_status" }).success).toBe(false);
  });

  it("validates Friend commands", () => {
    expect(FriendRequestCommandSchema.safeParse({ targetUserId: validUuid1 }).success).toBe(true);
    expect(FriendRequestCommandSchema.safeParse({ targetUserId: "not-a-uuid" }).success).toBe(
      false,
    );

    expect(
      FriendRespondCommandSchema.safeParse({
        senderUserId: validUuid1,
        accept: true,
      }).success,
    ).toBe(true);

    expect(
      BlockUserCommandSchema.safeParse({
        targetUserId: validUuid2,
        reason: "Spamming invitations",
      }).success,
    ).toBe(true);
  });
});
