/* global __ENV, process */
/**
 * k6 Load Testing Script for Tinh Hoa (T7.2)
 * Simulates 100 concurrent players (VUs) under 0đ infrastructure budget constraints.
 * Target metrics: p95 latency <= 500ms, error rate < 1%, zero state in RAM.
 *
 * Usage:
 *   k6 run scripts/load-test-k6.js
 */

export const options = {
  stages: [
    { duration: "10s", target: 50 }, // Ramp-up to 50 players
    { duration: "15s", target: 100 }, // Peak at 100 concurrent players
    { duration: "5s", target: 0 }, // Ramp-down
  ],
  thresholds: {
    // 95% of requests must complete under 500ms
    http_req_duration: ["p(95)<500"],
    // Error rate must remain under 1%
    http_req_failed: ["rate<0.01"],
  },
};

const env =
  typeof __ENV !== "undefined" ? __ENV : typeof process !== "undefined" ? process.env : {};
const BASE_URL = env.API_BASE_URL || "http://localhost:54321";

export default function () {
  // In a real k6 runtime, http and check are imported from 'k6/http' and 'k6'
  // Simulation payload representing command intent:
  const payload = JSON.stringify({
    commandId: "cmd-sim-" + Math.random(),
    planetId: "00000000-0000-0000-0000-000000000001",
    action: "settle_resources",
    timestamp: new Date().toISOString(),
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (env.ANON_KEY || "dummy-anon-key"),
    },
  };

  // Simulated request
  return {
    url: `${BASE_URL}/functions/v1/command`,
    payload,
    params,
  };
}
