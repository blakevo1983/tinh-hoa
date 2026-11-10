import { describe, it, expect } from "vitest";
import {
  ChatMessageSchema,
  ChatSendRequestSchema,
  ChatReportRequestSchema,
  NotificationSchema,
} from "./chat.js";

describe("Chat & Notification Schemas (T3.3)", () => {
  const validUuid = "11111111-2222-3333-4444-555555555555";

  it("validates ChatMessage structure", () => {
    const valid = {
      id: validUuid,
      channelId: "global",
      senderId: validUuid,
      senderName: "Voyager",
      clientMsgId: "cmsg-12345",
      content: "Xin chào vũ trụ!",
      filteredContent: "Xin chào vũ trụ!",
      createdAt: new Date().toISOString(),
    };
    expect(ChatMessageSchema.safeParse(valid).success).toBe(true);

    // Reject content > 300 chars
    expect(
      ChatMessageSchema.safeParse({
        ...valid,
        content: "a".repeat(301),
      }).success,
    ).toBe(false);
  });

  it("validates ChatSendRequest", () => {
    expect(
      ChatSendRequestSchema.safeParse({
        channelId: "global",
        clientMsgId: "msg-1",
        content: "Test message",
      }).success,
    ).toBe(true);

    // Empty content rejected
    expect(
      ChatSendRequestSchema.safeParse({
        channelId: "global",
        clientMsgId: "msg-1",
        content: "",
      }).success,
    ).toBe(false);
  });

  it("validates ChatReportRequest", () => {
    expect(
      ChatReportRequestSchema.safeParse({
        reportedUserId: validUuid,
        reason: "Spamming offensive language",
      }).success,
    ).toBe(true);

    // Reason too short (< 3 chars) rejected
    expect(
      ChatReportRequestSchema.safeParse({
        reportedUserId: validUuid,
        reason: "no",
      }).success,
    ).toBe(false);
  });

  it("validates NotificationSchema", () => {
    expect(
      NotificationSchema.safeParse({
        id: validUuid,
        recipientId: validUuid,
        type: "friend_request",
        title: "Lời mời kết bạn",
        body: "Alice đã gửi lời mời kết bạn cho bạn.",
        payload: { senderId: validUuid },
        read: false,
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});
