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

  describe("PlanetCreateCommandSchema", () => {
    it("parses valid planet.create command", () => {
      const raw = {
        type: "planet.create",
        idempotency_key: "seed-create-1",
        payload: {
          name: "Tinh Cầu Mộc",
          primary_element: "wood",
        },
      };

      const result = CommandSchema.safeParse(raw);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === "planet.create") {
        expect(result.data.payload.name).toBe("Tinh Cầu Mộc");
        expect(result.data.payload.primary_element).toBe("wood");
      }
    });

    it("rejects payload attempting to inject client seed", () => {
      const raw = {
        type: "planet.create",
        idempotency_key: "seed-create-hack",
        payload: {
          name: "CheatWorld",
          primary_element: "fire",
          seed: 9999999, // Injected seed should be rejected by strict schema
        },
      };

      const result = CommandSchema.safeParse(raw);
      expect(result.success).toBe(false);
    });

    it("rejects invalid primary_element", () => {
      const raw = {
        type: "planet.create",
        idempotency_key: "seed-create-invalid",
        payload: {
          name: "InvalidWorld",
          primary_element: "kryptonite",
        },
      };

      const result = CommandSchema.safeParse(raw);
      expect(result.success).toBe(false);
    });

    it("rejects empty planet name", () => {
      const raw = {
        type: "planet.create",
        idempotency_key: "seed-create-empty-name",
        payload: {
          name: "   ",
          primary_element: "metal",
        },
      };

      const result = CommandSchema.safeParse(raw);
      expect(result.success).toBe(false);
    });
  });
});
