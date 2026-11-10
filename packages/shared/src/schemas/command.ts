import { z } from "zod";
import { ElementKeySchema } from "./element.js";

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

export const PlanetCreateCommandSchema = BaseCommandSchema.extend({
  type: z.literal("planet.create"),
  payload: z
    .object({
      name: z.string().trim().min(1).max(30),
      primary_element: ElementKeySchema,
    })
    .strict(),
});

export type PlanetCreateCommand = z.infer<typeof PlanetCreateCommandSchema>;

export const CommandSchema = z.discriminatedUnion("type", [
  PingCommandSchema,
  PlanetCreateCommandSchema,
]);

export type Command = z.infer<typeof CommandSchema>;
