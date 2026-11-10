import { describe, it, expect, vi } from "vitest";
import { handleChatSend } from "./index.js";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(overrides?: {
  user?: { id: string } | null;
  authError?: Error | null;
  existingMessage?: Record<string, unknown> | null;
  rateLimitAllowed?: boolean;
  isMember?: boolean;
  isMuted?: boolean;
  lastGlobalMsgTime?: string | null;
  displayName?: string;
}): SupabaseClient {
  const user = overrides?.user !== undefined ? overrides.user : { id: "test-user-uuid" };
  const authError = overrides?.authError ?? null;
  const existingMessage = overrides?.existingMessage ?? null;
  const rateLimitAllowed =
    overrides?.rateLimitAllowed !== undefined ? overrides.rateLimitAllowed : true;
  const isMember = overrides?.isMember !== undefined ? overrides.isMember : true;
  const isMuted = overrides?.isMuted ?? false;
  const lastGlobalMsgTime = overrides?.lastGlobalMsgTime ?? null;
  const displayName = overrides?.displayName ?? "Test Voyager";

  const mockChannel = {
    send: vi.fn().mockResolvedValue({ status: "ok" }),
  };

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "chat_messages") {
        let isOrdering = false;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => {
            isOrdering = true;
            return {
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: lastGlobalMsgTime ? { created_at: lastGlobalMsgTime } : null,
                error: null,
              }),
            };
          }),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (isOrdering) {
              return Promise.resolve({
                data: lastGlobalMsgTime ? { created_at: lastGlobalMsgTime } : null,
                error: null,
              });
            }
            return Promise.resolve({
              data: existingMessage,
              error: null,
            });
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "chat_members") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: isMuted ? { muted_until: new Date(Date.now() + 60000).toISOString() } : null,
            error: null,
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { display_name: displayName },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "check_rate_limit") {
        return Promise.resolve({ data: rateLimitAllowed, error: null });
      }
      if (fn === "is_channel_member") {
        return Promise.resolve({ data: isMember, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
  };

  return mockClient as unknown as SupabaseClient;
}

describe("Edge Function: chat-send (T3.4)", () => {
  it("rejects non-POST requests", async () => {
    const req = new Request("http://localhost/chat-send", { method: "GET" });
    const res = await handleChatSend(req);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rejects requests without Authorization header", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      body: JSON.stringify({ channelId: "global", clientMsgId: "c1", content: "hi" }),
    });
    const res = await handleChatSend(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid body format", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "", content: "" }),
    });
    const res = await handleChatSend(req, { supabaseClient: createMockSupabase() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("handles duplicate requests idempotently", async () => {
    const existing = {
      id: "existing-uuid",
      channel_id: "global",
      sender_id: "test-user-uuid",
      client_msg_id: "cmsg-dup",
      content: "Hello again",
      filtered_content: "Hello again",
      created_at: new Date().toISOString(),
    };
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({
        channelId: "global",
        clientMsgId: "cmsg-dup",
        content: "Hello again",
      }),
    });
    const res = await handleChatSend(req, {
      supabaseClient: createMockSupabase({ existingMessage: existing }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idempotent).toBe(true);
    expect(body.message.id).toBe("existing-uuid");
  });

  it("enforces rate limits", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "global", clientMsgId: "c1", content: "hi" }),
    });
    const res = await handleChatSend(req, {
      supabaseClient: createMockSupabase({ rateLimitAllowed: false }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("enforces global channel cooldown", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "global", clientMsgId: "c1", content: "hi" }),
    });
    const res = await handleChatSend(req, {
      supabaseClient: createMockSupabase({
        lastGlobalMsgTime: new Date(Date.now() - 3000).toISOString(), // 3 seconds ago (< 10s cooldown)
      }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("GLOBAL_COOLDOWN");
  });

  it("rejects non-channel members", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "planet:private-1", clientMsgId: "c1", content: "hi" }),
    });
    const res = await handleChatSend(req, {
      supabaseClient: createMockSupabase({ isMember: false }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_A_CHANNEL_MEMBER");
  });

  it("rejects muted users", async () => {
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "planet:p1", clientMsgId: "c1", content: "hi" }),
    });
    const res = await handleChatSend(req, {
      supabaseClient: createMockSupabase({ isMuted: true }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("MUTED");
  });

  it("filters profanity and broadcasts message successfully", async () => {
    const mockClient = createMockSupabase();
    const req = new Request("http://localhost/chat-send", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
      body: JSON.stringify({ channelId: "global", clientMsgId: "c1", content: "Ê dmm chào bạn!" }),
    });
    const res = await handleChatSend(req, { supabaseClient: mockClient });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message.content).toBe("Ê dmm chào bạn!");
    expect(body.message.filteredContent).toContain("***");
  });
});
