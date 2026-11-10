export interface JobRecord {
  id: string;
  planet_id: string;
  kind: "build" | "upgrade" | "breed" | "craft" | "expedition";
  payload: Record<string, unknown>;
  finish_at: string; // ISO timestamp
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
export function settleJobs(jobs: readonly JobRecord[], nowMs: number): SettledJobResult {
  const completedJobIds: string[] = [];
  const effects: SettledJobResult["effects"] = [];

  for (const job of jobs) {
    if (job.status !== "running") continue;

    const finishMs = new Date(job.finish_at).getTime();
    if (finishMs <= nowMs) {
      completedJobIds.push(job.id);

      if (job.kind === "build") {
        effects.push({
          type: "create_building",
          kind: job.payload.kind,
          tile_x: job.payload.tile_x,
          tile_y: job.payload.tile_y,
          level: job.payload.level ?? 1,
        });
      } else if (job.kind === "upgrade") {
        effects.push({
          type: "upgrade_building",
          tile_x: job.payload.tile_x,
          tile_y: job.payload.tile_y,
        });
      }
    }
  }

  return {
    completedJobIds,
    effects,
  };
}
