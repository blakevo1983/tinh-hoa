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

export const BuildingPlaceCommandSchema = BaseCommandSchema.extend({
  type: z.literal("building.place"),
  payload: z
    .object({
      planet_id: z.string().uuid(),
      kind: z.enum(["harvester", "storage"]),
      tile_x: z.number().int().min(0).max(63),
      tile_y: z.number().int().min(0).max(63),
    })
    .strict(),
});

export type BuildingPlaceCommand = z.infer<typeof BuildingPlaceCommandSchema>;

export const BuildingUpgradeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("building.upgrade"),
  payload: z
    .object({
      planet_id: z.string().uuid(),
      building_id: z.string().uuid(),
    })
    .strict(),
});

export type BuildingUpgradeCommand = z.infer<typeof BuildingUpgradeCommandSchema>;

export const PlanetEvolveCommandSchema = BaseCommandSchema.extend({
  type: z.literal("planet.evolve"),
  payload: z
    .object({
      planet_id: z.string().uuid(),
    })
    .strict(),
});

export type PlanetEvolveCommand = z.infer<typeof PlanetEvolveCommandSchema>;

export const BreedStartCommandSchema = BaseCommandSchema.extend({
  type: z.literal("breed.start"),
  payload: z
    .object({
      planet_id: z.string().uuid(),
      parent_a_id: z.string().uuid(),
      parent_b_id: z.string().uuid(),
      catalyst_item_key: z.string().optional(),
    })
    .strict(),
});

export type BreedStartCommand = z.infer<typeof BreedStartCommandSchema>;

export const CraftStartCommandSchema = BaseCommandSchema.extend({
  type: z.literal("craft.start"),
  payload: z
    .object({
      planet_id: z.string().uuid(),
      recipe_key: z.string().min(1),
    })
    .strict(),
});

export type CraftStartCommand = z.infer<typeof CraftStartCommandSchema>;

export const CommandSchema = z.discriminatedUnion("type", [
  PingCommandSchema,
  PlanetCreateCommandSchema,
  BuildingPlaceCommandSchema,
  BuildingUpgradeCommandSchema,
  PlanetEvolveCommandSchema,
  BreedStartCommandSchema,
  CraftStartCommandSchema,
]);

export type Command = z.infer<typeof CommandSchema>;
