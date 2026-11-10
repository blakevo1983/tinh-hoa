import { describe, it, expect, vi, beforeEach } from "vitest";
import { initApp } from "./main.js";

describe("main client initialization", () => {
  beforeEach(() => {
    // Stub requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal("requestAnimationFrame", (fn: (time: number) => void) => {
      return setTimeout(() => fn(Date.now()), 16);
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  it("exports initApp function", () => {
    expect(typeof initApp).toBe("function");
  });
});
