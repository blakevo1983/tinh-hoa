import { describe, it, expect, vi } from "vitest";
import { handleCommand, MAX_BODY_BYTES } from "./index.js";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(overrides?: {
  user?: { id: string } | null;
  authError?: Error | null;
  idempotentResponse?: Record<string, unknown> | null;
  rateLimitAllowed?: boolean;
  existingPlanet?: { id: string } | null;
  planetOwnerId?: string;
  resourceBalance?: number;
  existingBuilding?: { id: string } | null;
}): SupabaseClient {
  const user = overrides?.user !== undefined ? overrides.user : { id: "test-user-uuid" };
  const authError = overrides?.authError ?? null;
  const idempotentResponse = overrides?.idempotentResponse ?? null;
  const rateLimitAllowed =
    overrides?.rateLimitAllowed !== undefined ? overrides.rateLimitAllowed : true;
  const existingPlanet = overrides?.existingPlanet ?? null;
  const planetOwnerId = overrides?.planetOwnerId ?? "test-user-uuid";
  const resourceBalance =
    overrides?.resourceBalance !== undefined ? overrides.resourceBalance : 100;
  const existingBuilding = overrides?.existingBuilding ?? null;

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "command_idempotency") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: idempotentResponse ? { response: idempotentResponse } : null,
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "planets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: existingPlanet,
                  error: null,
                }),
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "11111111-1111-1111-1111-111111111111",
                  owner_id: planetOwnerId,
                  primary_element: "wood",
                  state_version: 0,
                  stage: 1,
                  grid_size: 12,
                  seed: 123456,
                },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "new-planet-id-123",
                  name: "Test Planet",
                  primary_element: "water",
                  seed: 888888,
                  grid_size: 12,
                  stage: 1,
                  state_version: 0,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "buildings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                // If it's a count query for kind
                return {
                  count: 1,
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: existingBuilding,
                      error: null,
                    }),
                  }),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "building-uuid-1",
                      kind: "harvester",
                      level: 1,
                      tile_x: 2,
                      tile_y: 2,
                    },
                    error: null,
                  }),
                };
              }),
            }),
          }),
        };
      }
      if (table === "resource_balances") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    amount: resourceBalance,
                  },
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "planet_tiles" || table === "resource_ledger") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "creatures") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "11111111-2222-3333-4444-555555555551",
                    species_key: "verdant_sprout",
                    primary_element: "wood",
                    secondary_element: null,
                    stats: { qi: 30, guard: 20, agility: 25, harmony: 5, chaos: 10 },
                    traits: ["photosynthesis"],
                    generation: 1,
                    inbreeding: 0,
                  },
                  {
                    id: "11111111-2222-3333-4444-555555555552",
                    species_key: "aqua_slime",
                    primary_element: "water",
                    secondary_element: null,
                    stats: { qi: 28, guard: 22, agility: 30, harmony: 4, chaos: 12 },
                    traits: ["fluid_form"],
                    generation: 1,
                    inbreeding: 0,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "consume_rate_limit") {
        return Promise.resolve({ data: rateLimitAllowed, error: null });
      }
      if (fn === "commit_effects") {
        return Promise.resolve({ data: { success: true, state_version: 1 }, error: null });
      }
      if (fn === "evolve_planet") {
        return Promise.resolve({
          data: { success: true, new_stage: 2, new_grid_size: 16, state_version: 2 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  } as unknown as SupabaseClient;

  return mockClient;
}

describe("Command Gateway (Edge Function handleCommand)", () => {
  it("rejects request without JWT authorization header (401)", async () => {
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "system.ping", idempotency_key: "k1" }),
    });

    const res = await handleCommand(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(res.headers.get("x-request-id")).toBeDefined();
  });

  it("rejects request with invalid/expired JWT (401)", async () => {
    const mockSupabase = createMockSupabase({ user: null, authError: new Error("Invalid JWT") });
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ type: "system.ping", idempotency_key: "k1" }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects payload exceeding MAX_BODY_BYTES (413)", async () => {
    const mockSupabase = createMockSupabase();
    const oversizedBody = "a".repeat(MAX_BODY_BYTES + 10);

    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
        "Content-Length": String(oversizedBody.length),
      },
      body: oversizedBody,
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects invalid JSON body (400)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: "{ not a json",
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("rejects payload failing Zod schema validation (400)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "unknown_command_type",
        idempotency_key: "k-valid",
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.details).toBeDefined();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const mockSupabase = createMockSupabase({ rateLimitAllowed: false });
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "system.ping",
        idempotency_key: "k-rate-limited",
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("successfully processes system.ping command (200)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
        "X-Request-Id": "req-custom-123",
      },
      body: JSON.stringify({
        type: "system.ping",
        idempotency_key: "k-ping-1",
        payload: { client_timestamp: 123456789 },
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req-custom-123");

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.type).toBe("system.ping");
    expect(body.client_timestamp).toBe(123456789);
    expect(typeof body.server_time).toBe("number");
  });

  it("returns cached response for duplicate idempotency key (Idempotency check)", async () => {
    const cachedData = {
      ok: true,
      type: "system.ping",
      server_time: 999999999,
      client_timestamp: 111,
    };
    const mockSupabase = createMockSupabase({ idempotentResponse: cachedData });

    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "system.ping",
        idempotency_key: "k-duplicate",
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache")).toBe("HIT");

    const body = await res.json();
    expect(body).toEqual(cachedData);
  });

  describe("planet.create command", () => {
    it("successfully creates a planet and returns generated tiles with server seed", async () => {
      const mockSupabase = createMockSupabase();
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.create",
          idempotency_key: "create-planet-1",
          payload: {
            name: "Địa Cầu Mộc",
            primary_element: "wood",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.type).toBe("planet.create");
      expect(body.planet).toBeDefined();
      expect(body.tiles).toBeDefined();
      expect(body.tiles.length).toBe(144); // 12x12
    });

    it("rejects planet.create if user already owns a primary planet (409 Conflict)", async () => {
      const mockSupabase = createMockSupabase({
        existingPlanet: { id: "existing-planet-id" },
      });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.create",
          idempotency_key: "create-planet-again",
          payload: {
            name: "Second Planet",
            primary_element: "water",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error.code).toBe("ALREADY_EXISTS");
      expect(body.error.message_key).toBe("planet.already_exists");
    });

    it("rejects attempt to force seed from client (400 Bad Request via strict schema)", async () => {
      const mockSupabase = createMockSupabase();
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.create",
          idempotency_key: "hack-seed-attempt",
          payload: {
            name: "HackedSeedPlanet",
            primary_element: "fire",
            seed: 1234567, // Attempting to force seed from client
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("building.place command (T1.5)", () => {
    it("successfully places building when resource balance is sufficient", async () => {
      const mockSupabase = createMockSupabase({ resourceBalance: 100 });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "building.place",
          idempotency_key: "place-harvester-1",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            kind: "harvester",
            tile_x: 3,
            tile_y: 3,
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.type).toBe("building.place");
      expect(body.job).toBeDefined();
      expect(body.job.building_kind).toBe("harvester");
    });

    it("rejects building.place with INSUFFICIENT_RESOURCES when balance is below cost", async () => {
      const mockSupabase = createMockSupabase({ resourceBalance: 10 }); // Harvester costs 30
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "building.place",
          idempotency_key: "place-poor-attempt",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            kind: "harvester",
            tile_x: 3,
            tile_y: 3,
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INSUFFICIENT_RESOURCES");
    });

    it("rejects building.place with TILE_OCCUPIED when building already exists at tile", async () => {
      const mockSupabase = createMockSupabase({
        resourceBalance: 100,
        existingBuilding: { id: "existing-building-uuid" },
      });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "building.place",
          idempotency_key: "place-occupied-tile",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            kind: "storage",
            tile_x: 2,
            tile_y: 2,
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.error.code).toBe("TILE_OCCUPIED");
    });

    it("rejects building.place with NOT_OWNER when caller is not the planet owner", async () => {
      const mockSupabase = createMockSupabase({
        planetOwnerId: "other-user-uuid",
      });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "building.place",
          idempotency_key: "place-other-planet",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            kind: "harvester",
            tile_x: 4,
            tile_y: 4,
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_OWNER");
    });
  });

  describe("planet.evolve command", () => {
    it("successfully evolves planet from stage 1 to stage 2 when conditions are met", async () => {
      const mockSupabase = createMockSupabase({ resourceBalance: 150 });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.evolve",
          idempotency_key: "evolve-test-key-1",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.type).toBe("planet.evolve");
      expect(body.stage).toBe(2);
      expect(body.grid_size).toBe(16);
      expect(body.new_tiles_count).toBe(112);
    });

    it("rejects evolve command with NOT_OWNER when targeting foreign planet", async () => {
      const mockSupabase = createMockSupabase({
        planetOwnerId: "other-user-uuid",
      });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.evolve",
          idempotency_key: "evolve-alien-planet",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_OWNER");
    });

    it("rejects evolve command when resource balance is below 100", async () => {
      const mockSupabase = createMockSupabase({ resourceBalance: 99 });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "planet.evolve",
          idempotency_key: "evolve-broke",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INSUFFICIENT_RESOURCES");
    });
  });

  describe("breed.start command", () => {
    it("successfully creates breeding job when requirements are satisfied", async () => {
      const mockSupabase = createMockSupabase({ resourceBalance: 100 });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "breed.start",
          idempotency_key: "breed-valid-key-1",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            parent_a_id: "11111111-2222-3333-4444-555555555551",
            parent_b_id: "11111111-2222-3333-4444-555555555552",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.type).toBe("breed.start");
      expect(body.hatch_duration_sec).toBeGreaterThanOrEqual(60);
      expect(body.relation).toBeDefined();
    });

    it("rejects breed.start when parent A and parent B are the exact same creature", async () => {
      const mockSupabase = createMockSupabase();
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "breed.start",
          idempotency_key: "breed-clone-attempt",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            parent_a_id: "11111111-2222-3333-4444-555555555551",
            parent_b_id: "11111111-2222-3333-4444-555555555551",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe("INVALID_PARENTS");
    });

    it("rejects breed.start with NOT_OWNER when targeting foreign planet", async () => {
      const mockSupabase = createMockSupabase({
        planetOwnerId: "other-user-uuid",
      });
      const req = new Request("http://localhost/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          type: "breed.start",
          idempotency_key: "breed-foreign-planet",
          payload: {
            planet_id: "11111111-1111-1111-1111-111111111111",
            parent_a_id: "11111111-2222-3333-4444-555555555551",
            parent_b_id: "11111111-2222-3333-4444-555555555552",
          },
        }),
      });

      const res = await handleCommand(req, { supabaseClient: mockSupabase });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error.code).toBe("NOT_OWNER");
    });
  });
});
