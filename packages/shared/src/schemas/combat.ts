import { z } from "zod";
import { ELEMENT_KEYS } from "../config/elements.js";
import { StatsSchema } from "./element.js";

export const CombatFighterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  primaryElement: z.enum(ELEMENT_KEYS),
  secondaryElement: z.enum(ELEMENT_KEYS).nullable().optional(),
  stats: StatsSchema,
  currentHp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
});
export type CombatFighter = z.infer<typeof CombatFighterSchema>;

export const BattleRoundLogSchema = z.object({
  roundNumber: z.number().int().positive(),
  actingSide: z.enum(["attacker", "defender"]),
  actingFighterId: z.string(),
  actingFighterName: z.string(),
  targetFighterId: z.string(),
  targetFighterName: z.string(),
  damageDealt: z.number().int().nonnegative(),
  isCritical: z.boolean(),
  elementalMultiplier: z.number().positive(),
  targetRemainingHp: z.number().int().nonnegative(),
  descriptionVi: z.string(),
});
export type BattleRoundLog = z.infer<typeof BattleRoundLogSchema>;

export const BattleResultSchema = z.object({
  winnerSide: z.enum(["attacker", "defender", "draw"]),
  totalRounds: z.number().int().positive(),
  attackerRemainingHp: z.number().int().nonnegative(),
  defenderRemainingHp: z.number().int().nonnegative(),
  rounds: z.array(BattleRoundLogSchema),
  assimilatedGene: z
    .object({
      element: z.enum(ELEMENT_KEYS),
      bonusStatKey: z.string(),
      bonusValue: z.number(),
    })
    .nullable()
    .optional(),
});
export type BattleResult = z.infer<typeof BattleResultSchema>;
