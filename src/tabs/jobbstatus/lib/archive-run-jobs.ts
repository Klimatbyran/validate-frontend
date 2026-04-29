import type { SwimlaneStatusType } from "@/lib/types";

/** Jobs persisted to the archive are terminal finishes (completed / failed). */
export function isTerminalArchiveStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "completed" || s === "failed";
}

export function archiveStatusToSwimlane(status: string): SwimlaneStatusType {
  const s = status.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  return "waiting";
}

export type ArchiveJobLike = {
  queueName: string;
  status: string;
  finishedAt: string;
  jobId: string;
  failedReason?: string | null;
  startedAt?: string | null;
  id?: string;
};

/** Count terminal archive rows per queue (multiple rows ⇒ reruns / retries). */
export function terminalAttemptCountByQueue<T extends ArchiveJobLike>(jobs: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    if (!isTerminalArchiveStatus(j.status)) continue;
    counts.set(j.queueName, (counts.get(j.queueName) ?? 0) + 1);
  }
  return counts;
}

/** All terminal jobs for a queue, oldest → newest by `finishedAt`. */
export function sortedTerminalAttemptsForQueue<T extends ArchiveJobLike>(
  jobs: T[],
  queueName: string,
): T[] {
  return jobs
    .filter((j) => j.queueName === queueName && isTerminalArchiveStatus(j.status))
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime());
}
