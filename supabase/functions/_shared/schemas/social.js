import { z } from "zod";
export const FriendshipStatusSchema = z.enum(["pending", "accepted", "rejected"]);
export const PublicProfileSchema = z.object({
    id: z.string().uuid(),
    displayName: z.string().min(3).max(20),
    createdAt: z.string().datetime(),
    lastSeenAt: z.string().datetime().nullable().optional(),
});
export const FriendshipSchema = z.object({
    userId: z.string().uuid(),
    friendId: z.string().uuid(),
    status: FriendshipStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const UserBlockSchema = z.object({
    blockerId: z.string().uuid(),
    blockedId: z.string().uuid(),
    reason: z.string().max(200).nullable().optional(),
    createdAt: z.string().datetime(),
});
// Commands for Gateway & RPC
export const FriendRequestCommandSchema = z.object({
    targetUserId: z.string().uuid(),
});
export const FriendRespondCommandSchema = z.object({
    senderUserId: z.string().uuid(),
    accept: z.boolean(),
});
export const BlockUserCommandSchema = z.object({
    targetUserId: z.string().uuid(),
    reason: z.string().max(200).optional(),
});
//# sourceMappingURL=social.js.map