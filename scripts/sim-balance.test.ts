import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Balance Simulation Report (T2.7)", () => {
  it("verifies balance simulation report exists and contains required sections", () => {
    const reportDir = path.resolve(rootDir, "docs/balance");
    expect(fs.existsSync(reportDir)).toBe(true);

    const files = fs.readdirSync(reportDir).filter((f) => f.endsWith("-balance-report.md"));
    expect(files.length).toBeGreaterThan(0);

    const latestReport = path.resolve(reportDir, files[files.length - 1]);
    const content = fs.readFileSync(latestReport, "utf-8");

    // Check critical sections
    expect(content).toContain("Elemental Matchups");
    expect(content).toContain("Breeding Evolution");
    expect(content).toContain("Progression & Economy");
    expect(content).toContain("No positive-profit loops");
  });
});
