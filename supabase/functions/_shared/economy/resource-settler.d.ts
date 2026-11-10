export interface ResourceBalanceState {
    amount: number;
    ratePerSec: number;
    cap: number;
    updatedAtMs: number;
}
export interface SettleOptions {
    nowMs: number;
    offlineCapSec?: number;
}
export interface SettledResourceBalance {
    amount: number;
    ratePerSec: number;
    cap: number;
    updatedAtMs: number;
    producedDelta: number;
}
export declare const DEFAULT_OFFLINE_CAP_SEC: number;
/**
 * Pure function to calculate lazy resource settlement (offline progression).
 * - Caps progression to offlineCapSec (defaults to 8 hours).
 * - Never trusts client clock; accepts clock msec explicitly.
 * - Caps amount to balance.cap.
 * - If nowMs is in the past compared to updatedAtMs (clock anomalies), producedDelta is 0.
 */
export declare function settleResource(balance: ResourceBalanceState, options: SettleOptions): SettledResourceBalance;
/**
 * Settle all resource balances for a planet.
 */
export declare function settleAllResources(balances: Record<string, ResourceBalanceState>, options: SettleOptions): Record<string, SettledResourceBalance>;
//# sourceMappingURL=resource-settler.d.ts.map