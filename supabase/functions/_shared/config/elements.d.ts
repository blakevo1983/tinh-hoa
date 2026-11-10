export declare const ELEMENT_KEYS: readonly ["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"];
export type ElementKey = (typeof ELEMENT_KEYS)[number];
export declare const STAT_KEYS: readonly ["qi", "guard", "agility", "harmony", "chaos"];
export type StatKey = (typeof STAT_KEYS)[number];
export interface ElementStats {
    readonly qi: number;
    readonly guard: number;
    readonly agility: number;
    readonly harmony: number;
    readonly chaos: number;
}
export interface ElementDefinition {
    readonly key: ElementKey;
    readonly nameVi: string;
    readonly nameEn: string;
    readonly pastelColor: string;
    readonly symbol: string;
    readonly descriptionVi: string;
    readonly baseStats: ElementStats;
}
export declare const ELEMENT_DEFINITIONS: Record<ElementKey, ElementDefinition>;
/**
 * Generation relations: Key generates Value (A sinh B)
 * Mộc -> Hỏa -> Thổ -> Kim -> Thủy -> Mộc
 * Quang -> Mộc, Ám -> Thủy, Lôi -> Hỏa
 */
export declare const GENERATION_RELATIONS: ReadonlyArray<readonly [ElementKey, ElementKey]>;
/**
 * Overcoming relations: Key overcomes Value (A khắc B)
 * Mộc -> Thổ -> Thủy -> Hỏa -> Kim -> Mộc
 * Quang <-> Ám khắc lẫn nhau
 * Lôi -> Thủy, Lôi -> Kim, Thổ -> Lôi
 */
export declare const OVERCOMING_RELATIONS: ReadonlyArray<readonly [ElementKey, ElementKey]>;
export declare const COMBAT_MULTIPLIERS: {
    readonly overcomes: 1.5;
    readonly isOvercome: 0.67;
    readonly neutral: 1;
};
export declare function isGenerativeRelation(source: ElementKey, target: ElementKey): boolean;
export declare function isOvercomingRelation(attacker: ElementKey, defender: ElementKey): boolean;
export declare function getAffinityMultiplier(attacker: ElementKey, defender: ElementKey): number;
//# sourceMappingURL=elements.d.ts.map