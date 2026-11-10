import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CommandSchema, type Command, generatePlanet, ELEMENT_KEYS } from "@tinh-hoa/shared";

export const MAX_BODY_BYTES = 32 * 1024; // 32 KB payload limit

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
