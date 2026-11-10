import { z } from "zod";
export declare const BaseCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export declare const PingCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"system.ping">;
    payload: z.ZodDefault<z.ZodObject<{
        client_timestamp: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        client_timestamp?: number | undefined;
    }, {
        client_timestamp?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "system.ping";
    payload: {
        client_timestamp?: number | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "system.ping";
    idempotency_key: string;
    payload?: {
        client_timestamp?: number | undefined;
    } | undefined;
    expected_version?: number | undefined;
}>;
export type PingCommand = z.infer<typeof PingCommandSchema>;
export declare const PlanetCreateCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"planet.create">;
    payload: z.ZodObject<{
        name: z.ZodString;
        primary_element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    }, {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "planet.create";
    payload: {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "planet.create";
    payload: {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type PlanetCreateCommand = z.infer<typeof PlanetCreateCommandSchema>;
export declare const BuildingPlaceCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"building.place">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        kind: z.ZodEnum<["harvester", "storage"]>;
        tile_x: z.ZodNumber;
        tile_y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    }, {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "building.place";
    payload: {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "building.place";
    payload: {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type BuildingPlaceCommand = z.infer<typeof BuildingPlaceCommandSchema>;
export declare const BuildingUpgradeCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"building.upgrade">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        building_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        building_id: string;
    }, {
        planet_id: string;
        building_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "building.upgrade";
    payload: {
        planet_id: string;
        building_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "building.upgrade";
    payload: {
        planet_id: string;
        building_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type BuildingUpgradeCommand = z.infer<typeof BuildingUpgradeCommandSchema>;
export declare const PlanetEvolveCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"planet.evolve">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
    }, {
        planet_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "planet.evolve";
    payload: {
        planet_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "planet.evolve";
    payload: {
        planet_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type PlanetEvolveCommand = z.infer<typeof PlanetEvolveCommandSchema>;
export declare const BreedStartCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"breed.start">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        parent_a_id: z.ZodString;
        parent_b_id: z.ZodString;
        catalyst_item_key: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    }, {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "breed.start";
    payload: {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "breed.start";
    payload: {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type BreedStartCommand = z.infer<typeof BreedStartCommandSchema>;
export declare const CraftStartCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"craft.start">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        recipe_key: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        recipe_key: string;
    }, {
        planet_id: string;
        recipe_key: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "craft.start";
    payload: {
        planet_id: string;
        recipe_key: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "craft.start";
    payload: {
        planet_id: string;
        recipe_key: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type CraftStartCommand = z.infer<typeof CraftStartCommandSchema>;
export declare const CreatureHarvestCommandSchema: z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"creature.harvest">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        creature_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        creature_id: string;
    }, {
        planet_id: string;
        creature_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "creature.harvest";
    payload: {
        planet_id: string;
        creature_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "creature.harvest";
    payload: {
        planet_id: string;
        creature_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>;
export type CreatureHarvestCommand = z.infer<typeof CreatureHarvestCommandSchema>;
export declare const CommandSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"system.ping">;
    payload: z.ZodDefault<z.ZodObject<{
        client_timestamp: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        client_timestamp?: number | undefined;
    }, {
        client_timestamp?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "system.ping";
    payload: {
        client_timestamp?: number | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "system.ping";
    idempotency_key: string;
    payload?: {
        client_timestamp?: number | undefined;
    } | undefined;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"planet.create">;
    payload: z.ZodObject<{
        name: z.ZodString;
        primary_element: z.ZodEnum<["metal", "wood", "water", "fire", "earth", "light", "dark", "thunder"]>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    }, {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "planet.create";
    payload: {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "planet.create";
    payload: {
        name: string;
        primary_element: "metal" | "wood" | "water" | "fire" | "earth" | "light" | "dark" | "thunder";
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"building.place">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        kind: z.ZodEnum<["harvester", "storage"]>;
        tile_x: z.ZodNumber;
        tile_y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    }, {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "building.place";
    payload: {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "building.place";
    payload: {
        kind: "harvester" | "storage";
        planet_id: string;
        tile_x: number;
        tile_y: number;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"building.upgrade">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        building_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        building_id: string;
    }, {
        planet_id: string;
        building_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "building.upgrade";
    payload: {
        planet_id: string;
        building_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "building.upgrade";
    payload: {
        planet_id: string;
        building_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"planet.evolve">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
    }, {
        planet_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "planet.evolve";
    payload: {
        planet_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "planet.evolve";
    payload: {
        planet_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"breed.start">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        parent_a_id: z.ZodString;
        parent_b_id: z.ZodString;
        catalyst_item_key: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    }, {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "breed.start";
    payload: {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "breed.start";
    payload: {
        planet_id: string;
        parent_a_id: string;
        parent_b_id: string;
        catalyst_item_key?: string | undefined;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"craft.start">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        recipe_key: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        recipe_key: string;
    }, {
        planet_id: string;
        recipe_key: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "craft.start";
    payload: {
        planet_id: string;
        recipe_key: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "craft.start";
    payload: {
        planet_id: string;
        recipe_key: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>, z.ZodObject<{
    idempotency_key: z.ZodString;
    expected_version: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"creature.harvest">;
    payload: z.ZodObject<{
        planet_id: z.ZodString;
        creature_id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        planet_id: string;
        creature_id: string;
    }, {
        planet_id: string;
        creature_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "creature.harvest";
    payload: {
        planet_id: string;
        creature_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}, {
    type: "creature.harvest";
    payload: {
        planet_id: string;
        creature_id: string;
    };
    idempotency_key: string;
    expected_version?: number | undefined;
}>]>;
export type Command = z.infer<typeof CommandSchema>;
//# sourceMappingURL=command.d.ts.map