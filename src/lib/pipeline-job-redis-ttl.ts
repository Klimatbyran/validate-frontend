/** Rolling Redis retention assumed for completed pipeline jobs (align with ops default). */
export const PIPELINE_JOB_REDIS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

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

/** Anchor time (ms) for rolling retention: prefer completion, else enqueue. */
export function pipelineJobRedisRetentionAnchorMs(job: {
  finishedOn?: number;
  timestamp?: number;
}): number | null {
  if (typeof job.finishedOn === "number" && job.finishedOn > 0)
    return job.finishedOn;
  if (typeof job.timestamp === "number" && job.timestamp > 0)
    return job.timestamp;
  return null;
}

/** Milliseconds until estimated purge, or 0 if past window, or null if unknown anchor. */
export function getEstimatedRedisPurgeRemainingMs(job: {
  finishedOn?: number;
  timestamp?: number;
}): number | null {
  const anchor = pipelineJobRedisRetentionAnchorMs(job);
  if (anchor == null) return null;
  const purgeAt = anchor + PIPELINE_JOB_REDIS_RETENTION_MS;
  const remaining = purgeAt - Date.now();
  return Math.max(0, remaining);
}
