import { z } from "zod";
export declare const FriendshipStatusSchema: z.ZodEnum<["pending", "accepted", "rejected"]>;
export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>;
export declare const PublicProfileSchema: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    createdAt: z.ZodString;
    lastSeenAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    createdAt: string;
    lastSeenAt?: string | null | undefined;
}, {
    id: string;
    displayName: string;
    createdAt: string;
    lastSeenAt?: string | null | undefined;
}>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export declare const FriendshipSchema: z.ZodObject<{
    userId: z.ZodString;
    friendId: z.ZodString;
    status: z.ZodEnum<["pending", "accepted", "rejected"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    status: "pending" | "accepted" | "rejected";
    userId: string;
    friendId: string;
    updatedAt: string;
}, {
    createdAt: string;
    status: "pending" | "accepted" | "rejected";
    userId: string;
    friendId: string;
    updatedAt: string;
}>;
export type Friendship = z.infer<typeof FriendshipSchema>;
export declare const UserBlockSchema: z.ZodObject<{
    blockerId: z.ZodString;
    blockedId: z.ZodString;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    blockerId: string;
    blockedId: string;
    reason?: string | null | undefined;
}, {
    createdAt: string;
    blockerId: string;
    blockedId: string;
    reason?: string | null | undefined;
}>;
export type UserBlock = z.infer<typeof UserBlockSchema>;
export declare const FriendRequestCommandSchema: z.ZodObject<{
    targetUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetUserId: string;
}, {
    targetUserId: string;
}>;
export type FriendRequestCommand = z.infer<typeof FriendRequestCommandSchema>;
export declare const FriendRespondCommandSchema: z.ZodObject<{
    senderUserId: z.ZodString;
    accept: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    senderUserId: string;
    accept: boolean;
}, {
    senderUserId: string;
    accept: boolean;
}>;
export type FriendRespondCommand = z.infer<typeof FriendRespondCommandSchema>;
export declare const BlockUserCommandSchema: z.ZodObject<{
    targetUserId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetUserId: string;
    reason?: string | undefined;
}, {
    targetUserId: string;
    reason?: string | undefined;
}>;
export type BlockUserCommand = z.infer<typeof BlockUserCommandSchema>;
//# sourceMappingURL=social.d.ts.map