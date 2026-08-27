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

/** Builds a placeholder QueueJob from the lean baseJobSchema shape so it
 * can be handed to JobDetailsDialog — that dialog immediately re-fetches
 * the full job via GET /queues/{queueId}/{id} once opened, so this only
 * needs to satisfy the type and render a reasonable header until then. */
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
  };
}

/** Latest job per PDF-parsing queue for a given garbo threadId. Fetched
 * once per threadId (not polled) — supplementary visibility into a step
 * that normally completes well before a user is watching this tab. */
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

  return { jobsByQueue, isLoading, refresh: fetchJobs };
}
