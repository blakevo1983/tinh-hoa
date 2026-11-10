import type { ElementKey } from "./elements.js";
export interface BiomeDefinition {
    readonly key: string;
    readonly elementKey: ElementKey;
    readonly nameVi: string;
    readonly nameEn: string;
    readonly descriptionVi: string;
}
export declare const BIOMES_BY_ELEMENT: Record<ElementKey, readonly BiomeDefinition[]>;
//# sourceMappingURL=biomes.d.ts.map