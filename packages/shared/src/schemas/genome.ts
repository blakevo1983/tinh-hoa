import { z } from "zod";
import { ElementKeySchema, StatsSchema } from "./element.js";
import { GAME_LIMITS } from "../config/limits.js";

export const GenomeSchema = z.object({
  primary: ElementKeySchema,
  secondary: ElementKeySchema.nullable(),
  stats: StatsSchema,
  traits: z.array(z.string().min(1).max(32)).max(GAME_LIMITS.maxTraitsPerCreature),
  generation: z.number().int().min(1),
  inbreeding: z.number().int().min(0),
});

export type Genome = z.infer<typeof GenomeSchema>;
