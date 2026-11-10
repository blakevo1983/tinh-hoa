import type { ElementKey } from "../config/elements.js";
import type { BattleResult, BattleRoundLog, CombatFighter } from "../schemas/combat.js";

/**
 * Calculates combat effectiveness multiplier between attacker and defender elements.
 * Generative & Destructive elemental advantages per GDD 10.
 */
export function getCombatElementalMultiplier(
  attackerElement: ElementKey,
  defenderElement: ElementKey,
): number {
  if (attackerElement === defenderElement) return 1.0;

  // Polar clash: Light vs Dark deal +25% bonus mutual damage
  if (
    (attackerElement === "light" && defenderElement === "dark") ||
    (attackerElement === "dark" && defenderElement === "light")
  ) {
    return 1.25;
  }

  // Destructive cycle: Metal -> Wood -> Earth -> Water -> Fire -> Metal
  const counterMap: Record<string, ElementKey> = {
    metal: "wood",
    wood: "earth",
    earth: "water",
    water: "fire",
    fire: "metal",
  };

  // Attacker has elemental advantage
  if (counterMap[attackerElement] === defenderElement) {
    return 1.3; // +30% damage
  }

  // Attacker is countered by defender
  if (counterMap[defenderElement] === attackerElement) {
    return 0.75; // -25% damage penalty
  }

  // Thunder special interactions
  if (attackerElement === "thunder" && defenderElement === "water") return 1.25;
  if (attackerElement === "thunder" && defenderElement === "earth") return 0.8;

  return 1.0;
}

/**
 * Deterministic pseudo-random number generator for combat simulation
 */
class LcgRng {
  private state: number;
  constructor(seed: number) {
    this.state = (seed ^ 0x5deece66d) >>> 0;
  }
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}

/**
 * Pure function: Simulates turn-based auto combat between two teams.
 * Max 50 rounds guaranteed termination. Deterministic output based on seed.
 */
export function simulateBattle(
  attackerTeam: readonly CombatFighter[],
  defenderTeam: readonly CombatFighter[],
  seed: number,
): BattleResult {
  const rng = new LcgRng(seed);

  // Clone teams to preserve immutable inputs
  const attackers = attackerTeam.map((f) => ({
    ...f,
    currentHp: f.currentHp > 0 ? f.currentHp : f.maxHp,
  }));
  const defenders = defenderTeam.map((f) => ({
    ...f,
    currentHp: f.currentHp > 0 ? f.currentHp : f.maxHp,
  }));

  const roundLogs: BattleRoundLog[] = [];
  let roundNum = 0;
  const MAX_ROUNDS = 50;

  while (roundNum < MAX_ROUNDS) {
    roundNum++;

    // Check living fighters
    const liveAttackers = attackers.filter((a) => a.currentHp > 0);
    const liveDefenders = defenders.filter((d) => d.currentHp > 0);

    if (liveAttackers.length === 0 || liveDefenders.length === 0) {
      break;
    }

    // Combine all living combatants and sort by Agility descending
    type QueuedFighter = {
      side: "attacker" | "defender";
      fighter: (typeof attackers)[0];
    };

    const actionQueue: QueuedFighter[] = [
      ...liveAttackers.map((f) => ({ side: "attacker" as const, fighter: f })),
      ...liveDefenders.map((f) => ({ side: "defender" as const, fighter: f })),
    ].sort((a, b) => {
      if (b.fighter.stats.agility !== a.fighter.stats.agility) {
        return b.fighter.stats.agility - a.fighter.stats.agility;
      }
      return rng.next() > 0.5 ? 1 : -1;
    });

    for (const actor of actionQueue) {
      // Check if actor is still alive
      if (actor.fighter.currentHp <= 0) continue;

      const opposingList =
        actor.side === "attacker"
          ? defenders.filter((d) => d.currentHp > 0)
          : attackers.filter((a) => a.currentHp > 0);

      if (opposingList.length === 0) break;

      // Target selection: Target with lowest current HP (tactical focus)
      opposingList.sort((a, b) => a.currentHp - b.currentHp);
      const target = opposingList[0]!;

      // 1. Damage calculation
      const baseDamage = actor.fighter.stats.qi * 1.5;
      const defenseMitigation = target.stats.guard / (target.stats.guard + 50);
      const elemMult = getCombatElementalMultiplier(
        actor.fighter.primaryElement,
        target.primaryElement,
      );

      // Crit roll
      const critChance = actor.fighter.stats.chaos / 100;
      const isCritical = rng.next() < critChance;
      const critMult = isCritical ? 1.5 : 1.0;

      // Calculate final damage dealt
      const rawDamage = baseDamage * (1 - defenseMitigation) * elemMult * critMult;
      const damageDealt = Math.max(1, Math.floor(rawDamage));

      // Apply damage
      target.currentHp = Math.max(0, target.currentHp - damageDealt);

      // Description text
      let desc = `${actor.fighter.name} tấn công ${target.name} gây ${damageDealt} sát thương.`;
      if (isCritical) desc += " (Bạo kích!)";
      if (elemMult > 1.0) desc += " (Khắc chế nguyên tố!)";
      else if (elemMult < 1.0) desc += " (Bị khắc chế nguyên tố!)";
      if (target.currentHp === 0) desc += ` ${target.name} đã ngã xuống!`;

      roundLogs.push({
        roundNumber: roundNum,
        actingSide: actor.side,
        actingFighterId: actor.fighter.id,
        actingFighterName: actor.fighter.name,
        targetFighterId: target.id,
        targetFighterName: target.name,
        damageDealt,
        isCritical,
        elementalMultiplier: elemMult,
        targetRemainingHp: target.currentHp,
        descriptionVi: desc,
      });

      // Stop round early if enemy side wiped out
      const remainingOpponents =
        actor.side === "attacker"
          ? defenders.filter((d) => d.currentHp > 0)
          : attackers.filter((a) => a.currentHp > 0);

      if (remainingOpponents.length === 0) break;
    }
  }

  const totalAttackerHp = attackers.reduce((acc, f) => acc + f.currentHp, 0);
  const totalDefenderHp = defenders.reduce((acc, f) => acc + f.currentHp, 0);

  let winnerSide: "attacker" | "defender" | "draw" = "draw";
  if (totalAttackerHp > 0 && totalDefenderHp === 0) {
    winnerSide = "attacker";
  } else if (totalDefenderHp > 0 && totalAttackerHp === 0) {
    winnerSide = "defender";
  } else {
    // Timeout or both alive: compare percentage HP
    const initialAttackerHp = attackers.reduce((acc, f) => acc + f.maxHp, 0);
    const initialDefenderHp = defenders.reduce((acc, f) => acc + f.maxHp, 0);
    const pctA = totalAttackerHp / Math.max(1, initialAttackerHp);
    const pctD = totalDefenderHp / Math.max(1, initialDefenderHp);

    if (pctA > pctD) winnerSide = "attacker";
    else if (pctD > pctA) winnerSide = "defender";
    else winnerSide = "draw";
  }

  // Chance of assimilating a gene strain from defeated foes if attacker won
  let assimilatedGene: BattleResult["assimilatedGene"] = null;
  if (winnerSide === "attacker" && defenders.length > 0) {
    const fallenDefender = defenders[Math.floor(rng.next() * defenders.length)]!;
    assimilatedGene = {
      element: fallenDefender.primaryElement,
      bonusStatKey: "qi",
      bonusValue: Math.max(1, Math.floor(fallenDefender.stats.qi * 0.1)),
    };
  }

  return {
    winnerSide,
    totalRounds: roundNum,
    attackerRemainingHp: totalAttackerHp,
    defenderRemainingHp: totalDefenderHp,
    rounds: roundLogs,
    assimilatedGene,
  };
}
