import { z } from "zod";
export declare const ChatChannelKindSchema: z.ZodEnum<["global", "planet", "dm", "alliance", "party", "system"]>;
export type ChatChannelKind = z.infer<typeof ChatChannelKindSchema>;
export declare const ChatChannelSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["global", "planet", "dm", "alliance", "party", "system"]>;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "global" | "system" | "planet" | "dm" | "alliance" | "party";
    createdAt: string;
    name?: string | null | undefined;
}, {
    id: string;
    kind: "global" | "system" | "planet" | "dm" | "alliance" | "party";
    createdAt: string;
    name?: string | null | undefined;
}>;
export type ChatChannel = z.infer<typeof ChatChannelSchema>;
export declare const ChatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    channelId: z.ZodString;
    senderId: z.ZodString;
    senderName: z.ZodOptional<z.ZodString>;
    clientMsgId: z.ZodString;
    content: z.ZodString;
    filteredContent: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    channelId: string;
    senderId: string;
    clientMsgId: string;
    content: string;
    filteredContent: string;
    createdAt: string;
    senderName?: string | undefined;
}, {
    id: string;
    channelId: string;
    senderId: string;
    clientMsgId: string;
    content: string;
    filteredContent: string;
    createdAt: string;
    senderName?: string | undefined;
}>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export declare const ChatSendRequestSchema: z.ZodObject<{
    channelId: z.ZodString;
    clientMsgId: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    channelId: string;
    clientMsgId: string;
    content: string;
}, {
    channelId: string;
    clientMsgId: string;
    content: string;
}>;
export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;
export declare const ChatReportRequestSchema: z.ZodObject<{
    reportedUserId: z.ZodString;
    messageId: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
    contextSnapshot: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    reportedUserId: string;
    reason: string;
    messageId?: string | undefined;
    contextSnapshot?: Record<string, unknown>[] | undefined;
}, {
    reportedUserId: string;
    reason: string;
    messageId?: string | undefined;
    contextSnapshot?: Record<string, unknown>[] | undefined;
}>;
export type ChatReportRequest = z.infer<typeof ChatReportRequestSchema>;
export declare const NotificationTypeSchema: z.ZodEnum<["friend_request", "friend_accepted", "chat_mention", "chat_dm", "building_completed", "attack_alert", "system"]>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    recipientId: z.ZodString;
    type: z.ZodEnum<["friend_request", "friend_accepted", "chat_mention", "chat_dm", "building_completed", "attack_alert", "system"]>;
    title: z.ZodString;
    body: z.ZodString;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    read: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "friend_request" | "friend_accepted" | "chat_mention" | "chat_dm" | "building_completed" | "attack_alert" | "system";
    id: string;
    payload: Record<string, unknown>;
    createdAt: string;
    recipientId: string;
    title: string;
    body: string;
    read: boolean;
}, {
    type: "friend_request" | "friend_accepted" | "chat_mention" | "chat_dm" | "building_completed" | "attack_alert" | "system";
    id: string;
    createdAt: string;
    recipientId: string;
    title: string;
    body: string;
    payload?: Record<string, unknown> | undefined;
    read?: boolean | undefined;
}>;
export type Notification = z.infer<typeof NotificationSchema>;
//# sourceMappingURL=chat.d.ts.map