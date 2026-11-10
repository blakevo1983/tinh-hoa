import type { ElementKey } from "./elements.js";
import type { Stats } from "../schemas/element.js";
export type ItemCategory = "raw" | "compound" | "legendary";
export interface ItemDefinition {
    readonly key: string;
    readonly nameVi: string;
    readonly nameEn: string;
    readonly category: ItemCategory;
    readonly element: ElementKey;
    readonly secondaryElement?: ElementKey;
    readonly rarity: 1 | 2 | 3 | 4 | 5;
    readonly baseStats?: Stats;
    readonly descriptionVi: string;
}
export declare const BASE_ITEMS: readonly ItemDefinition[];
export declare const ITEMS_BY_KEY: Record<string, ItemDefinition>;
//# sourceMappingURL=items.d.ts.map