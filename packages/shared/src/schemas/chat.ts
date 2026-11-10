import { z } from "zod";

export const ChatChannelKindSchema = z.enum([
  "global",
  "planet",
  "dm",
  "alliance",
  "party",
  "system",
]);
export type ChatChannelKind = z.infer<typeof ChatChannelKindSchema>;

export const ChatChannelSchema = z.object({
  id: z.string().min(1),
  kind: ChatChannelKindSchema,
  name: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type ChatChannel = z.infer<typeof ChatChannelSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().min(1),
  senderId: z.string().uuid(),
  senderName: z.string().optional(),
  clientMsgId: z.string().min(1).max(64),
  content: z.string().min(1).max(300),
  filteredContent: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatSendRequestSchema = z.object({
  channelId: z.string().min(1).max(100),
  clientMsgId: z.string().min(1).max(64),
  content: z.string().min(1).max(300),
});
export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;

export const ChatReportRequestSchema = z.object({
  reportedUserId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  reason: z.string().min(3).max(500),
  contextSnapshot: z.array(z.record(z.unknown())).optional(),
});
export type ChatReportRequest = z.infer<typeof ChatReportRequestSchema>;

export const NotificationTypeSchema = z.enum([
  "friend_request",
  "friend_accepted",
  "chat_mention",
  "chat_dm",
  "building_completed",
  "attack_alert",
  "system",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  recipientId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  payload: z.record(z.unknown()).default({}),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;
