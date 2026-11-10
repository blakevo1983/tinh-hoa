import { describe, it, expect } from "vitest";
import { VERSION } from "./index.js";

describe("shared module", () => {
  it("exports package version", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
