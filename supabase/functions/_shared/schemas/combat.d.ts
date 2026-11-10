import { z } from "zod";
export declare const CombatFighterSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    primaryElement: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    secondaryElement: z.ZodOptional<z.ZodNullable<z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>>>;
    stats: z.ZodObject<{
        qi: z.ZodNumber;
        guard: z.ZodNumber;
        agility: z.ZodNumber;
        harmony: z.ZodNumber;
        chaos: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }, {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    }>;
    currentHp: z.ZodNumber;
    maxHp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    primaryElement: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    currentHp: number;
    maxHp: number;
    secondaryElement?: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null | undefined;
}, {
    id: string;
    name: string;
    primaryElement: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    stats: {
        qi: number;
        guard: number;
        agility: number;
        harmony: number;
        chaos: number;
    };
    currentHp: number;
    maxHp: number;
    secondaryElement?: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder" | null | undefined;
}>;
export type CombatFighter = z.infer<typeof CombatFighterSchema>;
export declare const BattleRoundLogSchema: z.ZodObject<{
    roundNumber: z.ZodNumber;
    actingSide: z.ZodEnum<["attacker", "defender"]>;
    actingFighterId: z.ZodString;
    actingFighterName: z.ZodString;
    targetFighterId: z.ZodString;
    targetFighterName: z.ZodString;
    damageDealt: z.ZodNumber;
    isCritical: z.ZodBoolean;
    elementalMultiplier: z.ZodNumber;
    targetRemainingHp: z.ZodNumber;
    descriptionVi: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roundNumber: number;
    actingSide: "attacker" | "defender";
    actingFighterId: string;
    actingFighterName: string;
    targetFighterId: string;
    targetFighterName: string;
    damageDealt: number;
    isCritical: boolean;
    elementalMultiplier: number;
    targetRemainingHp: number;
    descriptionVi: string;
}, {
    roundNumber: number;
    actingSide: "attacker" | "defender";
    actingFighterId: string;
    actingFighterName: string;
    targetFighterId: string;
    targetFighterName: string;
    damageDealt: number;
    isCritical: boolean;
    elementalMultiplier: number;
    targetRemainingHp: number;
    descriptionVi: string;
}>;
export type BattleRoundLog = z.infer<typeof BattleRoundLogSchema>;
export declare const BattleResultSchema: z.ZodObject<{
    winnerSide: z.ZodEnum<["attacker", "defender", "draw"]>;
    totalRounds: z.ZodNumber;
    attackerRemainingHp: z.ZodNumber;
    defenderRemainingHp: z.ZodNumber;
    rounds: z.ZodArray<z.ZodObject<{
        roundNumber: z.ZodNumber;
        actingSide: z.ZodEnum<["attacker", "defender"]>;
        actingFighterId: z.ZodString;
        actingFighterName: z.ZodString;
        targetFighterId: z.ZodString;
        targetFighterName: z.ZodString;
        damageDealt: z.ZodNumber;
        isCritical: z.ZodBoolean;
        elementalMultiplier: z.ZodNumber;
        targetRemainingHp: z.ZodNumber;
        descriptionVi: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        roundNumber: number;
        actingSide: "attacker" | "defender";
        actingFighterId: string;
        actingFighterName: string;
        targetFighterId: string;
        targetFighterName: string;
        damageDealt: number;
        isCritical: boolean;
        elementalMultiplier: number;
        targetRemainingHp: number;
        descriptionVi: string;
    }, {
        roundNumber: number;
        actingSide: "attacker" | "defender";
        actingFighterId: string;
        actingFighterName: string;
        targetFighterId: string;
        targetFighterName: string;
        damageDealt: number;
        isCritical: boolean;
        elementalMultiplier: number;
        targetRemainingHp: number;
        descriptionVi: string;
    }>, "many">;
    assimilatedGene: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
        bonusStatKey: z.ZodString;
        bonusValue: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        bonusStatKey: string;
        bonusValue: number;
    }, {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        bonusStatKey: string;
        bonusValue: number;
    }>>>;
}, "strip", z.ZodTypeAny, {
    winnerSide: "attacker" | "defender" | "draw";
    totalRounds: number;
    attackerRemainingHp: number;
    defenderRemainingHp: number;
    rounds: {
        roundNumber: number;
        actingSide: "attacker" | "defender";
        actingFighterId: string;
        actingFighterName: string;
        targetFighterId: string;
        targetFighterName: string;
        damageDealt: number;
        isCritical: boolean;
        elementalMultiplier: number;
        targetRemainingHp: number;
        descriptionVi: string;
    }[];
    assimilatedGene?: {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        bonusStatKey: string;
        bonusValue: number;
    } | null | undefined;
}, {
    winnerSide: "attacker" | "defender" | "draw";
    totalRounds: number;
    attackerRemainingHp: number;
    defenderRemainingHp: number;
    rounds: {
        roundNumber: number;
        actingSide: "attacker" | "defender";
        actingFighterId: string;
        actingFighterName: string;
        targetFighterId: string;
        targetFighterName: string;
        damageDealt: number;
        isCritical: boolean;
        elementalMultiplier: number;
        targetRemainingHp: number;
        descriptionVi: string;
    }[];
    assimilatedGene?: {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        bonusStatKey: string;
        bonusValue: number;
    } | null | undefined;
}>;
export type BattleResult = z.infer<typeof BattleResultSchema>;
//# sourceMappingURL=combat.d.ts.map