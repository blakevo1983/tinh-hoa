import { describe, it, expect, vi } from "vitest";
import { handleCommand, MAX_BODY_BYTES } from "./index.js";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(overrides?: {
  user?: { id: string } | null;
  authError?: Error | null;
  idempotentResponse?: Record<string, unknown> | null;
  rateLimitAllowed?: boolean;
}): SupabaseClient {
  const user = overrides?.user !== undefined ? overrides.user : { id: "test-user-uuid" };
  const authError = overrides?.authError ?? null;
  const idempotentResponse = overrides?.idempotentResponse ?? null;
  const rateLimitAllowed =
    overrides?.rateLimitAllowed !== undefined ? overrides.rateLimitAllowed : true;

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
      return {};
    }),
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "consume_rate_limit") {
        return Promise.resolve({ data: rateLimitAllowed, error: null });
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

  it("rejects oversized request body (413 Payload Too Large)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
        "Content-Length": String(MAX_BODY_BYTES + 100),
      },
      body: "{}",
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects malformed JSON body (400)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: "{ not valid json ",
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("rejects command with invalid schema (400)", async () => {
    const mockSupabase = createMockSupabase();
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "unknown.action",
        idempotency_key: "k1",
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.details).toBeDefined();
  });

  it("rejects request when rate limit is exceeded (429)", async () => {
    const mockSupabase = createMockSupabase({ rateLimitAllowed: false });
    const req = new Request("http://localhost/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "system.ping",
        idempotency_key: "k-rate-exceeded",
      }),
    });

    const res = await handleCommand(req, { supabaseClient: mockSupabase });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("executes valid system.ping command successfully (200 OK)", async () => {
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
        idempotency_key: "k-ping-ok",
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
});
