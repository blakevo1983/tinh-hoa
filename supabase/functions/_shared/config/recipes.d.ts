import type { ElementKey } from "./elements.js";
export interface RecipeCost {
    readonly resourceKey: ElementKey;
    readonly amount: number;
}
export interface RecipeDefinition {
    readonly key: string;
    readonly nameVi: string;
    readonly nameEn: string;
    readonly inputA: {
        readonly itemKey: string;
        readonly qty: number;
    };
    readonly inputB: {
        readonly itemKey: string;
        readonly qty: number;
    };
    readonly outputKey: string;
    readonly outputQty: number;
    readonly elementalCost: RecipeCost;
    readonly craftTimeSec: number;
    readonly isSecret?: boolean;
}
export declare const BASE_RECIPES: readonly RecipeDefinition[];
export declare const RECIPES_BY_KEY: Record<string, RecipeDefinition>;
//# sourceMappingURL=recipes.d.ts.map