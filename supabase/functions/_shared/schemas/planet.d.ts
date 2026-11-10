import { z } from "zod";
export declare const PlanetTileSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    biome: z.ZodString;
    richness: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    x: number;
    y: number;
    biome: string;
    richness: number;
}, {
    element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    x: number;
    y: number;
    biome: string;
    richness: number;
}>;
export type PlanetTile = z.infer<typeof PlanetTileSchema>;
export declare const GeneratedPlanetSchema: z.ZodObject<{
    seed: z.ZodNumber;
    primaryElement: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    gridSize: z.ZodNumber;
    tiles: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
        biome: z.ZodString;
        richness: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        x: number;
        y: number;
        biome: string;
        richness: number;
    }, {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        x: number;
        y: number;
        biome: string;
        richness: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tiles: {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        x: number;
        y: number;
        biome: string;
        richness: number;
    }[];
    seed: number;
    primaryElement: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    gridSize: number;
}, {
    tiles: {
        element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
        x: number;
        y: number;
        biome: string;
        richness: number;
    }[];
    seed: number;
    primaryElement: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    gridSize: number;
}>;
export type GeneratedPlanet = z.infer<typeof GeneratedPlanetSchema>;
//# sourceMappingURL=planet.d.ts.map