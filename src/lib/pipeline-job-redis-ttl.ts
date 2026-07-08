/** Live Redis keeps about this many completed runs per company (align with pipeline retention). */
export const PIPELINE_REDIS_RUNS_PER_COMPANY = 15;

const LIVE_STATUSES = new Set([
  "active",
  "waiting",
  "delayed",
  "paused",
  "prioritized",
  "waiting-children",
]);

export function isPipelineJobLikelyInRedisLiveState(job: {
  status?: string;
  data?: { status?: string };
  finishedOn?: number;
}): boolean {
  const s = job.status ?? job.data?.status;
  if (s && LIVE_STATUSES.has(s)) return true;
  if (typeof job.finishedOn === "number" && job.finishedOn > 0) return false;
  if (s === "completed" || s === "failed") return false;
  return true;
}
