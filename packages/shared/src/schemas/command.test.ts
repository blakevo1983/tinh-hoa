import { describe, it, expect } from "vitest";
import { CommandSchema, PingCommandSchema } from "./command.js";

describe("CommandSchema", () => {
  it("parses valid system.ping command", () => {
    const raw = {
      type: "system.ping",
      idempotency_key: "req-12345",
      expected_version: 1,
      payload: {
        client_timestamp: 1700000000000,
      },
    };

    const result = CommandSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("system.ping");
      expect(result.data.idempotency_key).toBe("req-12345");
    }
  });

  it("applies default empty payload for system.ping", () => {
    const raw = {
      type: "system.ping",
      idempotency_key: "req-12345",
    };

    const result = PingCommandSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload).toEqual({});
    }
  });

  it("rejects command without idempotency_key", () => {
    const raw = {
      type: "system.ping",
    };

    const result = CommandSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("rejects command with empty idempotency_key", () => {
    const raw = {
      type: "system.ping",
      idempotency_key: "",
    };

    const result = CommandSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("rejects unknown command types", () => {
    const raw = {
      type: "unknown.command",
      idempotency_key: "req-999",
    };

    const result = CommandSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});
