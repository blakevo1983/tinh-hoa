import { z } from "zod";
import { ElementKeySchema } from "./element.js";

export const PlanetTileSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  element: ElementKeySchema,
  biome: z.string().min(1),
  richness: z.number().int().min(1).max(5),
});

export type PlanetTile = z.infer<typeof PlanetTileSchema>;

export const GeneratedPlanetSchema = z.object({
  seed: z.number().int(),
  primaryElement: ElementKeySchema,
  gridSize: z.number().int().min(4).max(64),
  tiles: z.array(PlanetTileSchema),
});

export type GeneratedPlanet = z.infer<typeof GeneratedPlanetSchema>;
