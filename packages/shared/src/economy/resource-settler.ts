export interface ResourceBalanceState {
  amount: number;
  ratePerSec: number;
  cap: number;
  updatedAtMs: number;
}

export interface SettleOptions {
  nowMs: number;
  offlineCapSec?: number; // Default 8 hours (28,800 seconds)
}

export interface SettledResourceBalance {
  amount: number;
  ratePerSec: number;
  cap: number;
  updatedAtMs: number;
  producedDelta: number;
}

export const DEFAULT_OFFLINE_CAP_SEC = 8 * 3600; // 8 hours in seconds

/**
 * Pure function to calculate lazy resource settlement (offline progression).
 * - Caps progression to offlineCapSec (defaults to 8 hours).
 * - Never trusts client clock; accepts clock msec explicitly.
 * - Caps amount to balance.cap.
 * - If nowMs is in the past compared to updatedAtMs (clock anomalies), producedDelta is 0.
 */
export function settleResource(
  balance: ResourceBalanceState,
  options: SettleOptions,
): SettledResourceBalance {
  const { nowMs, offlineCapSec = DEFAULT_OFFLINE_CAP_SEC } = options;

  // Safe time elapsed (negative delta treated as 0)
  const rawElapsedSec = Math.max(0, (nowMs - balance.updatedAtMs) / 1000);
  const effectiveSec = Math.min(rawElapsedSec, Math.max(0, offlineCapSec));

  const rawProduced = effectiveSec * balance.ratePerSec;
  const targetAmount = balance.amount + rawProduced;
  const cappedAmount = Math.min(balance.cap, targetAmount);

  // Round to 4 decimal places for precision
  const finalAmount = Math.round(cappedAmount * 10000) / 10000;
  const producedDelta = Math.round((finalAmount - balance.amount) * 10000) / 10000;

  return {
    amount: finalAmount,
    ratePerSec: balance.ratePerSec,
    cap: balance.cap,
    updatedAtMs: nowMs,
    producedDelta: Math.max(0, producedDelta),
  };
}

/**
 * Settle all resource balances for a planet.
 */
export function settleAllResources(
  balances: Record<string, ResourceBalanceState>,
  options: SettleOptions,
): Record<string, SettledResourceBalance> {
  const settled: Record<string, SettledResourceBalance> = {};
  for (const [key, bal] of Object.entries(balances)) {
    settled[key] = settleResource(bal, options);
  }
  return settled;
}
