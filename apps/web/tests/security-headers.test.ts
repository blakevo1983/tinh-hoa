import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Cloudflare Pages Security Headers", () => {
  const headersPath = path.resolve(__dirname, "../public/_headers");

  it("ensures public/_headers exists", () => {
    expect(fs.existsSync(headersPath)).toBe(true);
  });

  it("configures essential security headers properly", () => {
    const content = fs.readFileSync(headersPath, "utf8");

    // X-Content-Type-Options: nosniff
    expect(content).toMatch(/X-Content-Type-Options:\s*nosniff/);

    // Frame clickjacking prevention
    expect(content).toMatch(/X-Frame-Options:\s*DENY/);
    expect(content).toMatch(/frame-ancestors\s+'none'/);

    // Referrer Policy
    expect(content).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/);

    // Strict Content Security Policy
    expect(content).toMatch(/Content-Security-Policy:/);
    expect(content).toMatch(/default-src\s+'self'/);
    expect(content).toMatch(/object-src\s+'none'/);
  });
});
