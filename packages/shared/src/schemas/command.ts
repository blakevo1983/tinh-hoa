import { z } from "zod";

export const BaseCommandSchema = z.object({
  idempotency_key: z.string().min(1).max(64),
  expected_version: z.number().int().min(0).optional(),
});

export const PingCommandSchema = BaseCommandSchema.extend({
  type: z.literal("system.ping"),
  payload: z
    .object({
      client_timestamp: z.number().int().optional(),
    })
    .default({}),
});

export type PingCommand = z.infer<typeof PingCommandSchema>;

export const CommandSchema = z.discriminatedUnion("type", [PingCommandSchema]);

export type Command = z.infer<typeof CommandSchema>;
