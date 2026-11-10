import type { ElementKey } from "../config/elements.js";
import type { Genome } from "../schemas/genome.js";
import { ITEMS_BY_KEY } from "../config/items.js";

export interface CreatureDropResult {
  itemKey: string;
  qty: number;
  isHybridDrop: boolean;
}

// Elemental mapping for pure creature drops
const PURE_DROPS_MAP: Record<ElementKey, string> = {
  metal: "iron_ore",
  wood: "ancient_wood",
  water: "pure_water",
  fire: "flame_coal",
  earth: "fertile_clay",
  light: "light_sand",
  dark: "obsidian_shard",
  thunder: "thunder_stone",
};

/**
 * Pure function: determine the resource or crafted material dropped by a creature (GDD 6).
 * Pure element creatures produce raw elements.
 * Hybrid creatures produce compound or legendary materials corresponding to their element pair.
 */
export function getCreatureDrop(genome: Genome): CreatureDropResult {
  const { primary, secondary, stats } = genome;

  if (secondary) {
    // Check known compound pairings
    const pairKey = [primary, secondary].sort().join(":");

    const hybridPairs: Record<string, string> = {
      "fire:metal": "alloy_ingot",
      "water:wood": "dew_essence",
      "earth:fire": "terracotta_brick",
      "earth:wood": "rooted_amber",
      "fire:water": "steam_crystal",
      "light:water": "celestial_dew",
      "dark:fire": "void_ash",
    };

    if (pairKey in hybridPairs) {
      const itemKey = hybridPairs[pairKey]!;
      // Quantity scales with Qi stat (qi >= 70 gives 2 units)
      const qty = stats.qi >= 70 ? 2 : 1;
      return { itemKey, qty, isHybridDrop: true };
    }
  }

  // Pure drop fallback
  const itemKey = PURE_DROPS_MAP[primary] || "ancient_wood";
  // Raw item quantity scales with Qi and Harmony: up to 3 units
  const bonus = stats.qi >= 50 && stats.harmony >= 30 ? 2 : 1;
  const qty = Math.max(1, bonus);

  return {
    itemKey: ITEMS_BY_KEY[itemKey] ? itemKey : "ancient_wood",
    qty,
    isHybridDrop: false,
  };
}
