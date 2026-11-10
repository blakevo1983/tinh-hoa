import type { ElementKey } from "./elements.js";
import type { Stats } from "../schemas/element.js";
export interface SpeciesDefinition {
    readonly key: string;
    readonly nameVi: string;
    readonly nameEn: string;
    readonly element: ElementKey;
    readonly stage: number;
    readonly baseStats: Stats;
    readonly defaultTraits: readonly string[];
    readonly descriptionVi: string;
}
export declare const BASE_SPECIES: readonly SpeciesDefinition[];
export declare const SPECIES_BY_KEY: Record<string, SpeciesDefinition>;
//# sourceMappingURL=species.d.ts.map