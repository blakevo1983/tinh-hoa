import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSupabaseConfigured, getSupabase } from "./supabase.js";

describe("Supabase client configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("checks whether environment variables are set", () => {
    // In test environment without .env, it should return false gracefully
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("returns null or client instance without throwing an unhandled exception", () => {
    const client = getSupabase();
    expect(client === null || typeof client === "object").toBe(true);
  });
});
