import { useState, useEffect, useCallback } from "react";
import { getPipelineUrl } from "@/config/api-env";
import type { QueueJob, SwimlaneStatusType } from "@/lib/types";

/** Garbo queue names for the two PDF-parsing steps — same ones jobbstatus
 * groups under its "preprocessing" pipeline step (workflow-config.ts). */
export const PDF_PARSING_QUEUES = ["parsePdf", "doclingParsePDF"] as const;

/** Shape returned by pipeline-api's GET /processes/:id/pdf-parsing —
 * baseJobSchema, not the full BullMQ Job shape (see JobDetailsDialog,
 * which re-fetches full detail once opened). */
export interface PdfParsingJob {
  id?: string;
  name: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  progress?: number;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  queue: string;
  data?: Record<string, unknown>;
}

export function derivePdfJobStatus(job: PdfParsingJob): SwimlaneStatusType {
  if (job.failedReason) return "failed";
  if (job.finishedOn) return "completed";
  if (job.processedOn) return "processing";
  return "waiting";
}

/** BullMQ status vocabulary ("failed"/"completed"/"active"/"waiting"), as
 * opposed to derivePdfJobStatus's SwimlaneStatusType — JobDetailsDialog and
 * its children (ErrorSection, the retry button) key error display and
 * retry off job.status/job.isFailed using these exact strings. */
function deriveBullMQStatus(job: PdfParsingJob): string {
  if (job.failedReason) return "failed";
  if (job.finishedOn) return "completed";
  if (job.processedOn) return "active";
  return "waiting";
}

/** Builds a placeholder QueueJob from the lean baseJobSchema shape so it
 * can be handed to JobDetailsDialog — that dialog immediately re-fetches
 * the full job via GET /queues/{queueId}/{id} once opened, so most of this
 * only needs to satisfy the type and render a reasonable header until
 * then. status/isFailed are the exception: the full-detail refetch's
 * response (pipeline-api's DataJob/baseJobSchema) doesn't carry isFailed
 * either, so retry and error display would stay broken even after that
 * resolves unless they're set correctly here. */
export function toQueueJobPlaceholder(job: PdfParsingJob): QueueJob {
  return {
    id: job.id ?? "",
    name: job.name,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    progress: job.progress,
    attempts: job.attemptsMade,
    stacktrace: job.stacktrace ?? [],
    opts: { attempts: job.attemptsMade },
    data: job.data ?? {},
    parent: undefined,
    queueId: job.queue,
    failedReason: job.failedReason,
    status: deriveBullMQStatus(job),
    isFailed: Boolean(job.failedReason),
  };
}

const POLL_MS = 5000;

/** Latest job per PDF-parsing queue for a given garbo threadId. Polls
 * every 5s (same interval useClimatePipelinePlans uses) while any tracked
 * job is still waiting/processing, same as the rest of this view — a
 * single fetch on mount used to be enough back when this step always
 * completed well before anyone looked, but the municipality-sources
 * registry's Run button put people watching this tab from the moment a
 * run starts, so a status that never updates past "waiting" reads as
 * broken even though the job finished seconds later. Stops polling once
 * every job has completed or failed, so a finished run doesn't poll
 * forever. */
export function usePdfParsingJobs(threadId: string | null | undefined) {
  const [jobsByQueue, setJobsByQueue] = useState<Map<string, PdfParsingJob>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!threadId) {
      setJobsByQueue(new Map());
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        getPipelineUrl(
          `/processes/${encodeURIComponent(threadId)}/pdf-parsing`,
        ),
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const jobs = (await res.json()) as PdfParsingJob[];
      const latestByQueue = new Map<string, PdfParsingJob>();
      for (const job of jobs) {
        const existing = latestByQueue.get(job.queue);
        if (!existing || job.timestamp > existing.timestamp) {
          latestByQueue.set(job.queue, job);
        }
      }
      setJobsByQueue(latestByQueue);
    } catch {
      setJobsByQueue(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const isSettled =
    jobsByQueue.size > 0 &&
    [...jobsByQueue.values()].every(
      (job) => derivePdfJobStatus(job) === "completed" || derivePdfJobStatus(job) === "failed",
    );

  useEffect(() => {
    if (!threadId || isSettled) return;
    const timer = window.setInterval(fetchJobs, POLL_MS);
    return () => window.clearInterval(timer);
  }, [threadId, isSettled, fetchJobs]);

  return { jobsByQueue, isLoading, refresh: fetchJobs };
}
