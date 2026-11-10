import { describe, it, expect } from "vitest";
import { SignUpSchema, SignInSchema, DisplayNameSchema } from "./auth.js";

describe("Auth Schemas", () => {
  it("validates correct sign-up payload", () => {
    const valid = {
      email: "player@example.com",
      password: "secure_password_123",
      displayName: "TinhHoaMaster",
      locale: "vi",
      turnstileToken: "dummy-turnstile-token",
    };
    const result = SignUpSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid display names", () => {
    // Too short
    expect(DisplayNameSchema.safeParse("ab").success).toBe(false);
    // Too long (>20 chars)
    expect(DisplayNameSchema.safeParse("ThisDisplayNameIsWayTooLong123").success).toBe(false);
    // Illegal characters (e.g. script tags / special symbols)
    expect(DisplayNameSchema.safeParse("<script>").success).toBe(false);
    expect(DisplayNameSchema.safeParse("Name; DROP TABLE").success).toBe(false);
  });

  it("rejects password shorter than 8 characters during sign-up", () => {
    const shortPassword = {
      email: "player@example.com",
      password: "short",
      displayName: "PlayerOne",
      turnstileToken: "dummy-token",
    };
    const result = SignUpSchema.safeParse(shortPassword);
    expect(result.success).toBe(false);
  });

  it("requires Turnstile token for sign-in and sign-up", () => {
    const missingToken = {
      email: "player@example.com",
      password: "secure_password_123",
      displayName: "PlayerOne",
      turnstileToken: "",
    };
    expect(SignUpSchema.safeParse(missingToken).success).toBe(false);

    const signinMissingToken = {
      email: "player@example.com",
      password: "secure_password_123",
      turnstileToken: "",
    };
    expect(SignInSchema.safeParse(signinMissingToken).success).toBe(false);
  });
});
