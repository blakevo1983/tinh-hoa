export interface JobRecord {
    id: string;
    planet_id: string;
    kind: "build" | "upgrade" | "breed" | "craft" | "expedition";
    payload: Record<string, unknown>;
    finish_at: string;
    status: "running" | "completed" | "cancelled";
}
export interface SettledJobResult {
    completedJobIds: string[];
    effects: Array<{
        type: "create_building" | "upgrade_building" | "update_resource_rate" | "update_resource_cap";
        [key: string]: unknown;
    }>;
}
/**
 * Pure function to inspect running jobs and determine which jobs have finished by nowMs.
 * Returns completed job IDs and corresponding state effects.
 */
export declare function settleJobs(jobs: readonly JobRecord[], nowMs: number): SettledJobResult;
//# sourceMappingURL=job-settler.d.ts.map