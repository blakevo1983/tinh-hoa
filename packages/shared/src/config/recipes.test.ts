import { describe, it, expect } from "vitest";
import { BASE_RECIPES, RECIPES_BY_KEY } from "./recipes.js";
import { ITEMS_BY_KEY } from "./items.js";
import { ELEMENT_KEYS } from "./elements.js";

describe("Crafting Recipes & Economic Invariants (T2.4)", () => {
  it("all recipes reference valid items and elements", () => {
    expect(BASE_RECIPES.length).toBeGreaterThanOrEqual(7);
    expect(Object.keys(RECIPES_BY_KEY).length).toBe(BASE_RECIPES.length);

    for (const recipe of BASE_RECIPES) {
      expect(ITEMS_BY_KEY[recipe.inputA.itemKey]).toBeDefined();
      expect(recipe.inputA.qty).toBeGreaterThanOrEqual(1);

      expect(ITEMS_BY_KEY[recipe.inputB.itemKey]).toBeDefined();
      expect(recipe.inputB.qty).toBeGreaterThanOrEqual(1);

      expect(ITEMS_BY_KEY[recipe.outputKey]).toBeDefined();
      expect(recipe.outputQty).toBeGreaterThanOrEqual(1);

      expect(ELEMENT_KEYS).toContain(recipe.elementalCost.resourceKey);
      expect(recipe.elementalCost.amount).toBeGreaterThan(0);
      expect(recipe.craftTimeSec).toBeGreaterThanOrEqual(10);
    }
  });

  it("strictly enforces sink-source balance: no infinite profit crafting cycles", () => {
    // Construct directed graph: input items -> output items
    const graph = new Map<string, Set<string>>();

    for (const recipe of BASE_RECIPES) {
      const inputs = [recipe.inputA.itemKey, recipe.inputB.itemKey];
      for (const input of inputs) {
        if (!graph.has(input)) {
          graph.set(input, new Set());
        }
        graph.get(input)!.add(recipe.outputKey);
      }
    }

    // Cycle detection via DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function hasCycle(node: string): boolean {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Found cycle!
        }
      }

      recStack.delete(node);
      return false;
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        expect(hasCycle(node)).toBe(false);
      }
    }
  });

  it("ensures output rarity is strictly greater than or equal to input rarity", () => {
    for (const recipe of BASE_RECIPES) {
      const inputRarityA = ITEMS_BY_KEY[recipe.inputA.itemKey]!.rarity;
      const inputRarityB = ITEMS_BY_KEY[recipe.inputB.itemKey]!.rarity;
      const maxInputRarity = Math.max(inputRarityA, inputRarityB);

      const outputRarity = ITEMS_BY_KEY[recipe.outputKey]!.rarity;
      expect(outputRarity).toBeGreaterThanOrEqual(maxInputRarity);
    }
  });
});
