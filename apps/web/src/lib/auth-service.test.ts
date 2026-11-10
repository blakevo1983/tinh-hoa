import { describe, it, expect } from "vitest";
import { signUpUser, signInUser } from "./auth-service.js";

describe("auth-service client validation", () => {
  it("rejects sign-up with invalid display name before making network request", async () => {
    const result = await signUpUser({
      email: "test@example.com",
      password: "password123",
      displayName: "x", // too short
      locale: "vi",
      turnstileToken: "token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects sign-up without Turnstile token", async () => {
    const result = await signUpUser({
      email: "test@example.com",
      password: "password123",
      displayName: "ValidUser",
      locale: "vi",
      turnstileToken: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects sign-in without Turnstile token", async () => {
    const result = await signInUser({
      email: "test@example.com",
      password: "password123",
      turnstileToken: "",
    });

    expect(result.success).toBe(false);
  });
});
