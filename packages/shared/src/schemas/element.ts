import { z } from "zod";
import { ELEMENT_KEYS, STAT_KEYS } from "../config/elements.js";
import { GAME_LIMITS } from "../config/limits.js";

export const ElementKeySchema = z.enum(ELEMENT_KEYS);

export const StatKeySchema = z.enum(STAT_KEYS);

export const StatsSchema = z.object({
  qi: z.number().int().min(GAME_LIMITS.minStatValue).max(GAME_LIMITS.maxStatValue),
  guard: z.number().int().min(GAME_LIMITS.minStatValue).max(GAME_LIMITS.maxStatValue),
  agility: z.number().int().min(GAME_LIMITS.minStatValue).max(GAME_LIMITS.maxStatValue),
  harmony: z.number().int().min(GAME_LIMITS.minStatValue).max(GAME_LIMITS.maxStatValue),
  chaos: z.number().int().min(GAME_LIMITS.minStatValue).max(GAME_LIMITS.maxStatValue),
});

export type Stats = z.infer<typeof StatsSchema>;
