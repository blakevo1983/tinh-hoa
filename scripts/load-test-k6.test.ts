import { describe, it, expect } from "vitest";
import { options } from "./load-test-k6.js";

describe("k6 Performance & 0đ Infrastructure Budget Benchmark (T7.2)", () => {
  it("targets 100 concurrent players with ramp-up and ramp-down stages", () => {
    expect(options.stages.length).toBe(3);
    const peakStage = options.stages.find((s) => s.target === 100);
    expect(peakStage).toBeDefined();
  });

  it("enforces strict sub-500ms p95 latency and <1% error rate thresholds", () => {
    expect(options.thresholds.http_req_duration).toContain("p(95)<500");
    expect(options.thresholds.http_req_failed).toContain("rate<0.01");
  });
});
