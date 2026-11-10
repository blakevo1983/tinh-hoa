import type { ElementKey } from "./elements.js";

export interface RecipeCost {
  readonly resourceKey: ElementKey;
  readonly amount: number;
}

export interface RecipeDefinition {
  readonly key: string;
  readonly nameVi: string;
  readonly nameEn: string;
  readonly inputA: { readonly itemKey: string; readonly qty: number };
  readonly inputB: { readonly itemKey: string; readonly qty: number };
  readonly outputKey: string;
  readonly outputQty: number;
  readonly elementalCost: RecipeCost;
  readonly craftTimeSec: number;
  readonly isSecret?: boolean;
}

export const BASE_RECIPES: readonly RecipeDefinition[] = [
  // 1. Alloy Ingot (Metal + Fire)
  {
    key: "recipe_alloy_ingot",
    nameVi: "Luyện Thỏi Hợp Kim",
    nameEn: "Smelt Alloy Ingot",
    inputA: { itemKey: "iron_ore", qty: 2 },
    inputB: { itemKey: "flame_coal", qty: 1 },
    outputKey: "alloy_ingot",
    outputQty: 1,
    elementalCost: { resourceKey: "metal", amount: 10 },
    craftTimeSec: 20,
  },

  // 2. Dew Essence (Water + Wood)
  {
    key: "recipe_dew_essence",
    nameVi: "Chưng Cất Sương Mai",
    nameEn: "Distill Dew Essence",
    inputA: { itemKey: "pure_water", qty: 2 },
    inputB: { itemKey: "ancient_wood", qty: 1 },
    outputKey: "dew_essence",
    outputQty: 1,
    elementalCost: { resourceKey: "water", amount: 10 },
    craftTimeSec: 25,
  },

  // 3. Terracotta Brick (Earth + Fire)
  {
    key: "recipe_terracotta_brick",
    nameVi: "Nung Gạch Cổ",
    nameEn: "Bake Terracotta Brick",
    inputA: { itemKey: "fertile_clay", qty: 2 },
    inputB: { itemKey: "flame_coal", qty: 1 },
    outputKey: "terracotta_brick",
    outputQty: 1,
    elementalCost: { resourceKey: "earth", amount: 10 },
    craftTimeSec: 20,
  },

  // 4. Rooted Amber (Wood + Earth)
  {
    key: "recipe_rooted_amber",
    nameVi: "Kết Tinh Hổ Phách",
    nameEn: "Crystallize Rooted Amber",
    inputA: { itemKey: "ancient_wood", qty: 2 },
    inputB: { itemKey: "fertile_clay", qty: 1 },
    outputKey: "rooted_amber",
    outputQty: 1,
    elementalCost: { resourceKey: "wood", amount: 10 },
    craftTimeSec: 30,
  },

  // 5. Steam Crystal (Water + Fire)
  {
    key: "recipe_steam_crystal",
    nameVi: "Ngưng Đọng Tinh Thể Hơi Nước",
    nameEn: "Condense Steam Crystal",
    inputA: { itemKey: "pure_water", qty: 2 },
    inputB: { itemKey: "flame_coal", qty: 1 },
    outputKey: "steam_crystal",
    outputQty: 1,
    elementalCost: { resourceKey: "water", amount: 15 },
    craftTimeSec: 35,
  },

  // 6. Legendary: Celestial Dew (Light + Water)
  {
    key: "recipe_celestial_dew",
    nameVi: "Hòa Quang Cam Lộ",
    nameEn: "Synthesize Celestial Dew",
    inputA: { itemKey: "light_sand", qty: 2 },
    inputB: { itemKey: "dew_essence", qty: 1 },
    outputKey: "celestial_dew",
    outputQty: 1,
    elementalCost: { resourceKey: "light", amount: 25 },
    craftTimeSec: 60,
  },

  // 7. Legendary: Void Ash (Dark + Fire)
  {
    key: "recipe_void_ash",
    nameVi: "Đốt Cháy Tro Tàn Hư Vô",
    nameEn: "Incinerate Void Ash",
    inputA: { itemKey: "obsidian_shard", qty: 2 },
    inputB: { itemKey: "flame_coal", qty: 2 },
    outputKey: "void_ash",
    outputQty: 1,
    elementalCost: { resourceKey: "dark", amount: 25 },
    craftTimeSec: 60,
  },
] as const;

export const RECIPES_BY_KEY: Record<string, RecipeDefinition> = Object.fromEntries(
  BASE_RECIPES.map((r) => [r.key, r]),
);
