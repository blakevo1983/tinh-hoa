import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CommandSchema,
  type Command,
  generatePlanet,
  generateExpandedTiles,
  breed,
  seededRng,
  getCreatureDrop,
  ITEMS_BY_KEY,
  RECIPES_BY_KEY,
  ELEMENT_KEYS,
  getBuildingCost,
  getBuildingTimeSec,
  type BuildingKind,
} from "@tinh-hoa/shared";

export const MAX_BODY_BYTES = 32 * 1024; // 32 KB payload limit

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

export interface CommandHandlerOptions {
  supabaseClient?: SupabaseClient;
  jwtSecret?: string;
}

export function createErrorResponse(
  status: number,
  code: string,
  messageKey: string,
  requestId: string,
  details?: unknown,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message_key: messageKey,
        ...(details !== undefined ? { details } : {}),
      },
    }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    },
  );
}

function toValidUuid(str: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  const hex1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  const hex3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, "0");
  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-8${hex3.slice(0, 3)}-${hex3}${hex1.slice(0, 4)}`;
}

export async function handleCommand(
  req: Request,
  options?: CommandHandlerOptions,
): Promise<Response> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  // 0. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // 1. HTTP Method validation (POST only)
  if (req.method !== "POST") {
    return createErrorResponse(405, "METHOD_NOT_ALLOWED", "http.method_not_allowed", requestId);
  }

  // 2. Body size check via Content-Length header
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return createErrorResponse(413, "PAYLOAD_TOO_LARGE", "error.payload_too_large", requestId);
  }

  // 3. Authentication: JWT verification
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createErrorResponse(401, "UNAUTHENTICATED", "auth.unauthenticated", requestId);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return createErrorResponse(401, "UNAUTHENTICATED", "auth.unauthenticated", requestId);
  }

  const getEnv = (key: string): string | undefined => {
    if (typeof Deno !== "undefined" && Deno.env) {
      return Deno.env.get(key);
    }
    if (typeof process !== "undefined" && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  const supabaseUrl = getEnv("SUPABASE_URL") || "http://127.0.0.1:54321";
  const supabaseServiceKey =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const supabase =
    options?.supabaseClient ||
    createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return createErrorResponse(401, "UNAUTHENTICATED", "auth.unauthenticated", requestId);
  }

  // 4. Body reading and size enforcement
  let rawBody: string;
  try {
    rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return createErrorResponse(413, "PAYLOAD_TOO_LARGE", "error.payload_too_large", requestId);
    }
  } catch {
    return createErrorResponse(400, "INVALID_INPUT", "command.invalid_body", requestId);
  }

  // 5. JSON Parsing
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return createErrorResponse(400, "INVALID_INPUT", "command.invalid_json", requestId);
  }

  // 6. Zod Schema Validation
  const validationResult = CommandSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    return createErrorResponse(
      400,
      "INVALID_INPUT",
      "command.invalid_input",
      requestId,
      validationResult.error.issues,
    );
  }

  const command: Command = validationResult.data;

  // 7. Idempotency Check (returns previously stored response if duplicate)
  const { data: existingIdempotency } = await supabase
    .from("command_idempotency")
    .select("response")
    .eq("idempotency_key", command.idempotency_key)
    .eq("user_id", user.id)
    .single();

  if (existingIdempotency?.response) {
    return new Response(JSON.stringify(existingIdempotency.response), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-Cache": "HIT",
      },
    });
  }

  // 8. Atomic Rate Limit Check via RPC
  const rateLimitKey = `cmd:${user.id}:${command.type}`;
  const { data: allowed, error: rateLimitError } = await supabase.rpc("consume_rate_limit", {
    p_key: rateLimitKey,
    p_cost: 1,
    p_capacity: 10,
    p_refill_rate: 0.1667, // 10 requests per minute
  });

  if (rateLimitError || allowed === false) {
    return createErrorResponse(429, "RATE_LIMITED", "command.rate_limited", requestId);
  }

  // 9. Command Dispatch (Pure Logic execution)
  let responsePayload: Record<string, unknown>;

  switch (command.type) {
    case "system.ping": {
      responsePayload = {
        ok: true,
        type: "system.ping",
        server_time: Date.now(),
        client_timestamp: command.payload.client_timestamp ?? null,
      };
      break;
    }

    case "planet.create": {
      // 9.1 Check if user already owns a primary planet
      const { data: existingPlanet } = await supabase
        .from("planets")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (existingPlanet) {
        return createErrorResponse(409, "ALREADY_EXISTS", "planet.already_exists", requestId);
      }

      // 9.2 Server generates random seed (never trusted from client)
      const randomBytes = new Uint32Array(1);
      crypto.getRandomValues(randomBytes);
      const serverSeed = randomBytes[0]!;

      // 9.3 Pure planet generation
      const gridSize = 12;
      const generated = generatePlanet({
        seed: serverSeed,
        primaryElement: command.payload.primary_element,
        gridSize,
      });

      // 9.4 Create planet record
      const { data: newPlanet, error: insertPlanetError } = await supabase
        .from("planets")
        .insert({
          owner_id: user.id,
          name: command.payload.name,
          primary_element: command.payload.primary_element,
          seed: serverSeed,
          grid_size: gridSize,
          stage: 1,
          state_version: 0,
          is_primary: true,
        })
        .select("id, name, primary_element, seed, grid_size, stage, state_version")
        .single();

      if (insertPlanetError || !newPlanet) {
        return createErrorResponse(
          500,
          "DATABASE_ERROR",
          "planet.create_failed",
          requestId,
          insertPlanetError?.message,
        );
      }

      // 9.5 Bulk insert planet tiles
      const tilesToInsert = generated.tiles.map((tile) => ({
        planet_id: newPlanet.id,
        x: tile.x,
        y: tile.y,
        element: tile.element,
        biome: tile.biome,
        richness: tile.richness,
      }));

      const { error: insertTilesError } = await supabase.from("planet_tiles").insert(tilesToInsert);

      if (insertTilesError) {
        return createErrorResponse(
          500,
          "DATABASE_ERROR",
          "planet.tiles_create_failed",
          requestId,
          insertTilesError.message,
        );
      }

      // 9.6 Initialize starter resource balances
      const initialBalances = ELEMENT_KEYS.map((elem) => ({
        planet_id: newPlanet.id,
        resource_key: elem,
        amount: elem === command.payload.primary_element ? 50 : 10,
        rate_per_sec: elem === command.payload.primary_element ? 0.5 : 0.1,
        cap: 500,
      }));

      await supabase.from("resource_balances").insert(initialBalances);

      // 9.7 Record genesis event in append-only resource_ledger
      await supabase.from("resource_ledger").insert({
        planet_id: newPlanet.id,
        resource_key: command.payload.primary_element,
        delta: 50,
        reason: "planet_genesis",
        idempotency_key: toValidUuid(command.idempotency_key),
      });

      responsePayload = {
        ok: true,
        type: "planet.create",
        planet: newPlanet,
        tiles: generated.tiles,
      };
      break;
    }

    case "building.place": {
      const { planet_id, kind, tile_x, tile_y } = command.payload;

      // 1. Verify planet ownership
      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, primary_element, state_version")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      // 2. Check tile occupancy
      const { data: existingBuilding } = await supabase
        .from("buildings")
        .select("id")
        .eq("planet_id", planet_id)
        .eq("tile_x", tile_x)
        .eq("tile_y", tile_y)
        .maybeSingle();

      if (existingBuilding) {
        return createErrorResponse(409, "TILE_OCCUPIED", "building.tile_occupied", requestId);
      }

      // 3. Check resource cost
      const cost = getBuildingCost(kind, 1, planet.primary_element);
      const { data: balance } = await supabase
        .from("resource_balances")
        .select("amount")
        .eq("planet_id", planet_id)
        .eq("resource_key", cost.resourceKey)
        .single();

      if (!balance || balance.amount < cost.amount) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_RESOURCES",
          "resource.insufficient",
          requestId,
          { required: cost.amount, current: balance?.amount ?? 0 },
        );
      }

      // 4. Calculate finish_at timestamp
      const buildTimeSec = getBuildingTimeSec(kind, 1);
      const finishAtIso = new Date(Date.now() + buildTimeSec * 1000).toISOString();

      // 5. Commit effects via RPC commit_effects
      const effects = [
        {
          type: "resource_delta",
          resource_key: cost.resourceKey,
          delta: -cost.amount,
        },
        {
          type: "create_job",
          kind: "build",
          payload: { kind, tile_x, tile_y, level: 1 },
          finish_at: finishAtIso,
        },
      ];

      const { data: commitResult, error: commitError } = await supabase.rpc("commit_effects", {
        p_planet_id: planet_id,
        p_expected_version: command.expected_version ?? planet.state_version,
        p_effects: effects,
        p_idempotency_key: toValidUuid(command.idempotency_key),
        p_reason: `build_${kind}`,
      });

      if (commitError) {
        return createErrorResponse(400, "COMMIT_FAILED", commitError.message, requestId);
      }

      responsePayload = {
        ok: true,
        type: "building.place",
        job: {
          kind: "build",
          tile_x,
          tile_y,
          building_kind: kind,
          finish_at: finishAtIso,
        },
        new_version: commitResult.state_version,
      };
      break;
    }

    case "building.upgrade": {
      const { planet_id, building_id } = command.payload;

      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, primary_element, state_version")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      const { data: building } = await supabase
        .from("buildings")
        .select("id, kind, level, tile_x, tile_y")
        .eq("id", building_id)
        .eq("planet_id", planet_id)
        .single();

      if (!building) {
        return createErrorResponse(404, "NOT_FOUND", "building.not_found", requestId);
      }

      const nextLevel = building.level + 1;
      const cost = getBuildingCost(
        building.kind as BuildingKind,
        nextLevel,
        planet.primary_element,
      );

      const { data: balance } = await supabase
        .from("resource_balances")
        .select("amount")
        .eq("planet_id", planet_id)
        .eq("resource_key", cost.resourceKey)
        .single();

      if (!balance || balance.amount < cost.amount) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_RESOURCES",
          "resource.insufficient",
          requestId,
          { required: cost.amount, current: balance?.amount ?? 0 },
        );
      }

      const buildTimeSec = getBuildingTimeSec(building.kind as BuildingKind, nextLevel);
      const finishAtIso = new Date(Date.now() + buildTimeSec * 1000).toISOString();

      const effects = [
        {
          type: "resource_delta",
          resource_key: cost.resourceKey,
          delta: -cost.amount,
        },
        {
          type: "create_job",
          kind: "upgrade",
          payload: {
            building_id: building.id,
            tile_x: building.tile_x,
            tile_y: building.tile_y,
            level: nextLevel,
          },
          finish_at: finishAtIso,
        },
      ];

      const { data: commitResult, error: commitError } = await supabase.rpc("commit_effects", {
        p_planet_id: planet_id,
        p_expected_version: command.expected_version ?? planet.state_version,
        p_effects: effects,
        p_idempotency_key: toValidUuid(command.idempotency_key),
        p_reason: `upgrade_${building.kind}`,
      });

      if (commitError) {
        return createErrorResponse(400, "COMMIT_FAILED", commitError.message, requestId);
      }

      responsePayload = {
        ok: true,
        type: "building.upgrade",
        job: {
          kind: "upgrade",
          building_id: building.id,
          next_level: nextLevel,
          finish_at: finishAtIso,
        },
        new_version: commitResult.state_version,
      };
      break;
    }

    case "planet.evolve": {
      const { planet_id } = command.payload;

      // Settle offline jobs and resources first
      await supabase.rpc("settle_planet_jobs", { p_planet_id: planet_id });
      await supabase.rpc("settle_planet_resources", { p_planet_id: planet_id });

      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, state_version, seed, primary_element, grid_size, stage")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      if (planet.stage !== 1) {
        return createErrorResponse(400, "INVALID_STAGE", "evolution.invalid_stage", requestId);
      }

      // Check harvester and storage
      const { count: harvesterCount } = await supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("planet_id", planet_id)
        .eq("kind", "harvester");

      const { count: storageCount } = await supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("planet_id", planet_id)
        .eq("kind", "storage");

      if (!harvesterCount || harvesterCount < 1 || !storageCount || storageCount < 1) {
        return createErrorResponse(
          400,
          "MISSING_EVOLUTION_REQUIREMENTS",
          "evolution.requirements_not_met",
          requestId,
        );
      }

      // Check balance >= 100
      const { data: balance } = await supabase
        .from("resource_balances")
        .select("amount")
        .eq("planet_id", planet_id)
        .eq("resource_key", planet.primary_element)
        .single();

      if (!balance || balance.amount < 100) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_RESOURCES",
          "resource.insufficient",
          requestId,
          { required: 100, current: balance?.amount ?? 0 },
        );
      }

      // Generate expanded tiles deterministically from original seed
      const newGridSize = 16;
      const expandedTiles = generateExpandedTiles({
        seed: planet.seed,
        primaryElement: planet.primary_element,
        currentGridSize: planet.grid_size,
        newGridSize,
      });

      const { data: evolveResult, error: evolveError } = await supabase.rpc("evolve_planet", {
        p_planet_id: planet_id,
        p_expected_version: command.expected_version ?? planet.state_version,
        p_new_tiles: expandedTiles,
        p_idempotency_key: toValidUuid(command.idempotency_key),
      });

      if (evolveError) {
        return createErrorResponse(400, "EVOLVE_FAILED", evolveError.message, requestId);
      }

      responsePayload = {
        ok: true,
        type: "planet.evolve",
        planet_id,
        stage: evolveResult.new_stage,
        grid_size: evolveResult.new_grid_size,
        new_tiles_count: expandedTiles.length,
        new_version: evolveResult.state_version,
      };
      break;
    }

    case "breed.start": {
      const { planet_id, parent_a_id, parent_b_id, catalyst_item_key } = command.payload;

      if (parent_a_id === parent_b_id) {
        return createErrorResponse(400, "INVALID_PARENTS", "breeding.same_parent", requestId);
      }

      // Settle offline jobs and resources first
      await supabase.rpc("settle_planet_jobs", { p_planet_id: planet_id });
      await supabase.rpc("settle_planet_resources", { p_planet_id: planet_id });

      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, state_version, seed, primary_element")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      // Check required Harmony Pool building
      const { count: poolCount } = await supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("planet_id", planet_id)
        .eq("kind", "harmony_pool");

      if (!poolCount || poolCount < 1) {
        return createErrorResponse(
          400,
          "MISSING_HARMONY_POOL",
          "breeding.missing_harmony_pool",
          requestId,
        );
      }

      // Fetch both parents on this planet
      const { data: creatures } = await supabase
        .from("creatures")
        .select(
          "id, species_key, primary_element, secondary_element, stats, traits, generation, inbreeding, parent_a, parent_b",
        )
        .eq("planet_id", planet_id)
        .in("id", [parent_a_id, parent_b_id]);

      if (!creatures || creatures.length < 2) {
        return createErrorResponse(
          404,
          "CREATURE_NOT_FOUND",
          "breeding.creature_not_found",
          requestId,
        );
      }

      const parentAData = creatures.find((c) => c.id === parent_a_id)!;
      const parentBData = creatures.find((c) => c.id === parent_b_id)!;

      // Check harmony >= 3 for both parents
      const harmonyA = (parentAData.stats as { harmony?: number })?.harmony ?? 0;
      const harmonyB = (parentBData.stats as { harmony?: number })?.harmony ?? 0;

      if (harmonyA < 3 || harmonyB < 3) {
        return createErrorResponse(400, "HARMONY_TOO_LOW", "breeding.harmony_too_low", requestId, {
          required: 3,
          parentA: harmonyA,
          parentB: harmonyB,
        });
      }

      // Check primary resource balance (cost 20)
      const { data: balance } = await supabase
        .from("resource_balances")
        .select("amount")
        .eq("planet_id", planet_id)
        .eq("resource_key", planet.primary_element)
        .single();

      if (!balance || balance.amount < 20) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_RESOURCES",
          "resource.insufficient",
          requestId,
          { required: 20, current: balance?.amount ?? 0 },
        );
      }

      // Catalyst validation if provided
      let catalyst: { itemKey: string; element: (typeof ELEMENT_KEYS)[number] } | undefined;
      if (catalyst_item_key) {
        const itemDef = ITEMS_BY_KEY[catalyst_item_key];
        if (itemDef) {
          catalyst = { itemKey: catalyst_item_key, element: itemDef.element };
        }
      }

      // Server-authoritative deterministic seed calculation
      const serverSeed = `${planet.seed}:breed:${parent_a_id}:${parent_b_id}:${Date.now()}`;
      const rng = seededRng(serverSeed);
      const clock = { now: () => Date.now() };

      const breedResult = breed({
        parentA: {
          id: parentAData.id,
          speciesKey: parentAData.species_key,
          genome: {
            primary: parentAData.primary_element,
            secondary: parentAData.secondary_element,
            stats: parentAData.stats,
            traits: parentAData.traits,
            generation: parentAData.generation,
            inbreeding: parentAData.inbreeding,
          },
          parentAId: parentAData.parent_a,
          parentBId: parentAData.parent_b,
        },
        parentB: {
          id: parentBData.id,
          speciesKey: parentBData.species_key,
          genome: {
            primary: parentBData.primary_element,
            secondary: parentBData.secondary_element,
            stats: parentBData.stats,
            traits: parentBData.traits,
            generation: parentBData.generation,
            inbreeding: parentBData.inbreeding,
          },
          parentAId: parentBData.parent_a,
          parentBId: parentBData.parent_b,
        },
        catalyst,
        rng,
        clock,
        planetId: planet_id,
      });

      const { data: commitResult, error: commitError } = await supabase.rpc("commit_effects", {
        p_planet_id: planet_id,
        p_expected_version: command.expected_version ?? planet.state_version,
        p_effects: breedResult.effects,
        p_idempotency_key: toValidUuid(command.idempotency_key),
        p_reason: "breed_creature",
      });

      if (commitError) {
        return createErrorResponse(400, "COMMIT_FAILED", commitError.message, requestId);
      }

      responsePayload = {
        ok: true,
        type: "breed.start",
        relation: breedResult.relation,
        hatch_duration_sec: breedResult.hatchDurationSec,
        finish_at: breedResult.finishAtIso,
        child_species_key: breedResult.childSpeciesKey,
        new_version: commitResult.state_version,
      };
      break;
    }

    case "craft.start": {
      const { planet_id, recipe_key } = command.payload;

      const recipe = RECIPES_BY_KEY[recipe_key];
      if (!recipe) {
        return createErrorResponse(404, "RECIPE_NOT_FOUND", "crafting.recipe_not_found", requestId);
      }

      // Settle offline jobs and resources first
      await supabase.rpc("settle_planet_jobs", { p_planet_id: planet_id });
      await supabase.rpc("settle_planet_resources", { p_planet_id: planet_id });

      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, state_version")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      // Check Crafting Furnace building
      const { count: furnaceCount } = await supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("planet_id", planet_id)
        .eq("kind", "crafting_furnace");

      if (!furnaceCount || furnaceCount < 1) {
        return createErrorResponse(
          400,
          "MISSING_CRAFTING_FURNACE",
          "crafting.missing_furnace",
          requestId,
        );
      }

      // Check elemental resource cost
      const { data: balance } = await supabase
        .from("resource_balances")
        .select("amount")
        .eq("planet_id", planet_id)
        .eq("resource_key", recipe.elementalCost.resourceKey)
        .single();

      if (!balance || balance.amount < recipe.elementalCost.amount) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_RESOURCES",
          "resource.insufficient",
          requestId,
          { required: recipe.elementalCost.amount, current: balance?.amount ?? 0 },
        );
      }

      // Check materials in inventory
      const { data: items } = await supabase
        .from("items")
        .select("id, def_key")
        .in("def_key", [recipe.inputA.itemKey, recipe.inputB.itemKey]);

      const itemA = items?.find((i) => i.def_key === recipe.inputA.itemKey);
      const itemB = items?.find((i) => i.def_key === recipe.inputB.itemKey);

      if (!itemA || !itemB) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_MATERIALS",
          "crafting.missing_materials",
          requestId,
        );
      }

      const { data: inventoryA } = await supabase
        .from("inventory")
        .select("qty")
        .eq("planet_id", planet_id)
        .eq("item_id", itemA.id)
        .single();

      const { data: inventoryB } = await supabase
        .from("inventory")
        .select("qty")
        .eq("planet_id", planet_id)
        .eq("item_id", itemB.id)
        .single();

      if (
        !inventoryA ||
        inventoryA.qty < recipe.inputA.qty ||
        !inventoryB ||
        inventoryB.qty < recipe.inputB.qty
      ) {
        return createErrorResponse(
          400,
          "INSUFFICIENT_MATERIALS",
          "crafting.missing_materials",
          requestId,
        );
      }

      // Deduct materials from inventory
      await supabase
        .from("inventory")
        .update({ qty: inventoryA.qty - recipe.inputA.qty })
        .eq("planet_id", planet_id)
        .eq("item_id", itemA.id);

      await supabase
        .from("inventory")
        .update({ qty: inventoryB.qty - recipe.inputB.qty })
        .eq("planet_id", planet_id)
        .eq("item_id", itemB.id);

      const finishAtIso = new Date(Date.now() + recipe.craftTimeSec * 1000).toISOString();

      const effects = [
        {
          type: "resource_delta",
          resource_key: recipe.elementalCost.resourceKey,
          delta: -recipe.elementalCost.amount,
        },
        {
          type: "create_job",
          kind: "craft",
          payload: {
            recipe_key: recipe.key,
            output_key: recipe.outputKey,
            output_qty: recipe.outputQty,
          },
          finish_at: finishAtIso,
        },
      ];

      const { data: commitResult, error: commitError } = await supabase.rpc("commit_effects", {
        p_planet_id: planet_id,
        p_expected_version: command.expected_version ?? planet.state_version,
        p_effects: effects,
        p_idempotency_key: toValidUuid(command.idempotency_key),
        p_reason: `craft_${recipe.outputKey}`,
      });

      if (commitError) {
        return createErrorResponse(400, "COMMIT_FAILED", commitError.message, requestId);
      }

      responsePayload = {
        ok: true,
        type: "craft.start",
        recipe_key: recipe.key,
        output_key: recipe.outputKey,
        output_qty: recipe.outputQty,
        craft_time_sec: recipe.craftTimeSec,
        finish_at: finishAtIso,
        new_version: commitResult.state_version,
      };
      break;
    }

    case "creature.harvest": {
      const { planet_id, creature_id } = command.payload;

      // Settle offline jobs and resources first
      await supabase.rpc("settle_planet_jobs", { p_planet_id: planet_id });
      await supabase.rpc("settle_planet_resources", { p_planet_id: planet_id });

      const { data: planet } = await supabase
        .from("planets")
        .select("id, owner_id, state_version")
        .eq("id", planet_id)
        .single();

      if (!planet || planet.owner_id !== user.id) {
        return createErrorResponse(403, "NOT_OWNER", "command.not_owner", requestId);
      }

      const { data: creature } = await supabase
        .from("creatures")
        .select(
          "id, species_key, primary_element, secondary_element, stats, traits, generation, inbreeding",
        )
        .eq("id", creature_id)
        .eq("planet_id", planet_id)
        .single();

      if (!creature) {
        return createErrorResponse(404, "CREATURE_NOT_FOUND", "creature.not_found", requestId);
      }

      // Calculate drop item
      const drop = getCreatureDrop({
        primary: creature.primary_element,
        secondary: creature.secondary_element,
        stats: creature.stats,
        traits: creature.traits,
        generation: creature.generation,
        inbreeding: creature.inbreeding,
      });

      // Ensure item exists in items table
      let itemId: string;
      const { data: existingItem } = await supabase
        .from("items")
        .select("id")
        .eq("def_key", drop.itemKey)
        .maybeSingle();

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        const { data: newItem } = await supabase
          .from("items")
          .insert({ def_key: drop.itemKey })
          .select("id")
          .single();
        itemId = newItem?.id || crypto.randomUUID();
      }

      // Add to inventory
      const { data: invRow } = await supabase
        .from("inventory")
        .select("qty")
        .eq("planet_id", planet_id)
        .eq("item_id", itemId)
        .maybeSingle();

      if (invRow) {
        await supabase
          .from("inventory")
          .update({ qty: invRow.qty + drop.qty })
          .eq("planet_id", planet_id)
          .eq("item_id", itemId);
      } else {
        await supabase.from("inventory").insert({ planet_id, item_id: itemId, qty: drop.qty });
      }

      // Record in codex
      await supabase
        .from("codex_entries")
        .insert({
          player_id: user.id,
          kind: "item",
          entry_key: drop.itemKey,
        })
        .select();

      responsePayload = {
        ok: true,
        type: "creature.harvest",
        creature_id,
        item_key: drop.itemKey,
        qty: drop.qty,
        is_hybrid: drop.isHybridDrop,
      };
      break;
    }
  }

  // 10. Persist Idempotency record
  await supabase.from("command_idempotency").insert({
    idempotency_key: command.idempotency_key,
    user_id: user.id,
    response: responsePayload,
  });

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
  });
}

// Deno server invocation when deployed as Supabase Edge Function
if (typeof Deno !== "undefined" && "serve" in Deno) {
  // @ts-expect-error Deno global runtime API
  Deno.serve((req: Request) => handleCommand(req));
}
