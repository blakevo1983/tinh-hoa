import { z } from "zod";

export const FriendshipStatusSchema = z.enum(["pending", "accepted", "rejected"]);
export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>;

export const PublicProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(3).max(20),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable().optional(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const FriendshipSchema = z.object({
  userId: z.string().uuid(),
  friendId: z.string().uuid(),
  status: FriendshipStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Friendship = z.infer<typeof FriendshipSchema>;

export const UserBlockSchema = z.object({
  blockerId: z.string().uuid(),
  blockedId: z.string().uuid(),
  reason: z.string().max(200).nullable().optional(),
  createdAt: z.string().datetime(),
});
export type UserBlock = z.infer<typeof UserBlockSchema>;

// Commands for Gateway & RPC
export const FriendRequestCommandSchema = z.object({
  targetUserId: z.string().uuid(),
});
export type FriendRequestCommand = z.infer<typeof FriendRequestCommandSchema>;

export const FriendRespondCommandSchema = z.object({
  senderUserId: z.string().uuid(),
  accept: z.boolean(),
});
export type FriendRespondCommand = z.infer<typeof FriendRespondCommandSchema>;

export const BlockUserCommandSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});
export type BlockUserCommand = z.infer<typeof BlockUserCommandSchema>;
