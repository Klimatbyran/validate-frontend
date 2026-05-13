import type { CustomAPICompany } from "@/lib/types";
import {
  getAllPipelineSteps,
  getQueuesForPipelineStep,
} from "@/lib/workflow-config";
import { getJobStatus } from "@/lib/workflow-utils";

export type AttentionItem = {
  key: string;
  companyName: string;
  year?: number;
  processId: string;
  threadId: string;
  hasFailed: boolean;
  hasPendingApproval: boolean;
  failedCount: number;
  timestamp: number;
};

export type ProcessingItem = {
  key: string;
  companyName: string;
  year?: number;
  processId: string;
  threadId: string;
  timestamp: number;
};

type ProcessLike = {
  id?: string;
  year?: number;
  status?: string;
  startedAt?: number;
  finishedAt?: number;
  jobs?: Array<{
    id?: string;
    timestamp?: number;
    status?: string;
    queue?: string;
    queueId?: string;
    url?: string;
    sourceUrl?: string;
    data?: unknown;
    approval?: unknown;
    threadId?: unknown;
  }>;
};

export type JobStatusOverlaySummary = {
  attentionItems: AttentionItem[];
  processingItems: ProcessingItem[];
  processingCount: number;
  failedCount: number;
  approvalCount: number;
};

function resolveCanonicalThreadId(process: ProcessLike): string {
  for (const job of process.jobs || []) {
    const fromData = (job.data as { threadId?: unknown } | undefined)?.threadId;
    if (typeof fromData === "string" && fromData.length > 0) {
      return fromData;
    }
    if (typeof job.threadId === "string" && job.threadId.length > 0) {
      return job.threadId;
    }
  }
  return process.id || "unknown-process";
}

function resolveJobThreadId(
  job: { data?: unknown; threadId?: unknown },
  fallback: string,
): string {
  const fromData = (job.data as { threadId?: unknown } | undefined)?.threadId;
  if (typeof fromData === "string" && fromData.length > 0) {
    return fromData;
  }
  if (typeof job.threadId === "string" && job.threadId.length > 0) {
    return job.threadId;
  }
  return fallback;
}

function resolveLatestThreadId(process: ProcessLike): string {
  const fallback = resolveCanonicalThreadId(process);
  const jobs = process.jobs || [];
  if (jobs.length === 0) return fallback;

  const latestJob = [...jobs].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
  )[0];
  if (!latestJob) return fallback;
  return resolveJobThreadId(latestJob, fallback);
}

function resolveCanonicalReportUrl(process: ProcessLike): string | null {
  for (const job of process.jobs || []) {
    const data = job.data as
      | {
          url?: unknown;
          sourceUrl?: unknown;
          reportUrl?: unknown;
          pdfUrl?: unknown;
          cachedPdfUrl?: unknown;
        }
      | undefined;
    const rawUrl =
      job.url ||
      job.sourceUrl ||
      (typeof data?.url === "string" ? data.url : undefined) ||
      (typeof data?.sourceUrl === "string" ? data.sourceUrl : undefined) ||
      (typeof data?.reportUrl === "string" ? data.reportUrl : undefined) ||
      (typeof data?.pdfUrl === "string" ? data.pdfUrl : undefined) ||
      (typeof data?.cachedPdfUrl === "string" ? data.cachedPdfUrl : undefined);
    if (typeof rawUrl === "string" && rawUrl.trim().length > 0) {
      try {
        const parsed = new URL(rawUrl.trim());
        parsed.hash = "";
        parsed.search = "";
        const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
        return `${parsed.origin.toLowerCase()}${normalizedPath.toLowerCase()}`;
      } catch {
        return rawUrl
          .trim()
          .toLowerCase()
          .replace(/\?.*$/, "")
          .replace(/#.*$/, "");
      }
    }
  }
  return null;
}

function normalizeCompanyKey(companyName: string, wikidataId?: string): string {
  if (wikidataId && wikidataId.trim().length > 0) {
    return `wd:${wikidataId.trim().toLowerCase()}`;
  }
  return `name:${companyName.trim().toLowerCase()}`;
}

function resolveCanonicalYear(process: ProcessLike): number | undefined {
  if (typeof process.year === "number" && Number.isFinite(process.year)) {
    return process.year;
  }

  for (const job of process.jobs || []) {
    const jobYear = (job.data as { year?: unknown } | undefined)?.year;
    if (typeof jobYear === "number" && Number.isFinite(jobYear)) {
      return jobYear;
    }
    if (typeof jobYear === "string") {
      const parsed = Number(jobYear);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function resolveProcessTimestamp(process: ProcessLike): number {
  const startedAt = process.startedAt || 0;
  const finishedAt = process.finishedAt || 0;
  const latestJobTimestamp = Math.max(
    0,
    ...(process.jobs || []).map((job) => job.timestamp || 0),
  );

  return Math.max(startedAt, finishedAt, latestJobTimestamp);
}

function getLatestJobsByQueue(
  jobs: NonNullable<ProcessLike["jobs"]>,
  pipelineQueueIds: Set<string>,
): NonNullable<ProcessLike["jobs"]> {
  const latestByQueue = new Map<
    string,
    NonNullable<ProcessLike["jobs"]>[number]
  >();

  for (const [index, job] of jobs.entries()) {
    const resolvedQueueId =
      typeof job.queueId === "string" && pipelineQueueIds.has(job.queueId)
        ? job.queueId
        : typeof job.queue === "string" && pipelineQueueIds.has(job.queue)
          ? job.queue
          : undefined;
    const queueKey =
      resolvedQueueId || job.id || `unknown-queue-${String(index)}`;
    const existing = latestByQueue.get(queueKey);
    if (!existing || (existing.timestamp || 0) < (job.timestamp || 0)) {
      latestByQueue.set(queueKey, job);
    }
  }

  return Array.from(latestByQueue.values());
}

export function buildJobStatusOverlaySummary(
  companies: CustomAPICompany[],
  fallbackCompanyName: string,
): JobStatusOverlaySummary {
  const pipelineQueueIds = new Set(
    getAllPipelineSteps().flatMap((step) => getQueuesForPipelineStep(step.id)),
  );

  const attentionItems: AttentionItem[] = [];
  const activeProcessingByThread = new Map<string, ProcessingItem>();
  const latestProcessByReportKey = new Map<
    string,
    {
      companyName: string;
      year?: number;
      processId: string;
      threadId: string;
      jobs: NonNullable<ProcessLike["jobs"]>;
      timestamp: number;
    }
  >();

  for (const company of companies) {
    const companyName =
      company.company || company.processes?.[0]?.company || fallbackCompanyName;
    const companyKey = normalizeCompanyKey(companyName, company.wikidataId);

    for (const process of company.processes || []) {
      if (!process.id) continue;
      const canonicalThreadId = resolveCanonicalThreadId(process);
      const canonicalReportUrl = resolveCanonicalReportUrl(process);
      const canonicalYear = resolveCanonicalYear(process);
      const reportKey = canonicalReportUrl
        ? `${companyKey}::url:${canonicalReportUrl}`
        : canonicalYear != null
          ? `${companyKey}::year:${String(canonicalYear)}`
          : `${companyKey}::thread:${canonicalThreadId}`;
      const timestamp = resolveProcessTimestamp(process);
      const latestThreadId = resolveLatestThreadId(process);

      const isInFlightProcess =
        process.status === "active" || process.status === "waiting";
      if (isInFlightProcess) {
        const processingKey = `${companyKey}::thread:${latestThreadId}`;
        const existingActive = activeProcessingByThread.get(processingKey);
        if (!existingActive || existingActive.timestamp < timestamp) {
          activeProcessingByThread.set(processingKey, {
            key: `${process.id}:${latestThreadId}`,
            companyName,
            year: canonicalYear,
            processId: process.id,
            threadId: latestThreadId,
            timestamp,
          });
        }
      }

      const existing = latestProcessByReportKey.get(reportKey);
      if (!existing || existing.timestamp < timestamp) {
        latestProcessByReportKey.set(reportKey, {
          companyName,
          year: canonicalYear,
          processId: process.id,
          threadId: latestThreadId,
          jobs: process.jobs || [],
          timestamp,
        });
      }
    }
  }

  for (const process of latestProcessByReportKey.values()) {
    const threadJobs = process.jobs.filter(
      (job) => resolveJobThreadId(job, process.threadId) === process.threadId,
    );
    const scopedJobs = threadJobs.length > 0 ? threadJobs : process.jobs;
    const latestScopedJobs = getLatestJobsByQueue(scopedJobs, pipelineQueueIds);
    const latestPipelineJobs = latestScopedJobs.filter((job) => {
      if (
        typeof job.queueId === "string" &&
        pipelineQueueIds.has(job.queueId)
      ) {
        return true;
      }
      return typeof job.queue === "string" && pipelineQueueIds.has(job.queue);
    });

    const failedCount = scopedJobs.filter(
      (job) => job.status === "failed",
    ).length;
    const hasPendingApproval = latestPipelineJobs.some(
      (job) => getJobStatus(job) === "needs_approval",
    );
    const hasFailed = failedCount > 0;
    const isPendingApprovalOnly = hasPendingApproval && !hasFailed;

    if (!hasFailed && !isPendingApprovalOnly) continue;

    attentionItems.push({
      key: `${process.processId}:${process.year ?? "na"}`,
      companyName: process.companyName,
      year: process.year,
      processId: process.processId,
      threadId: process.threadId,
      hasFailed,
      hasPendingApproval: isPendingApprovalOnly,
      failedCount,
      timestamp: process.timestamp,
    });
  }

  attentionItems.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
    const aSeverity = a.hasFailed ? 2 : a.hasPendingApproval ? 1 : 0;
    const bSeverity = b.hasFailed ? 2 : b.hasPendingApproval ? 1 : 0;
    if (aSeverity !== bSeverity) return bSeverity - aSeverity;
    return a.companyName.localeCompare(b.companyName);
  });

  const attentionProcessIds = new Set(
    attentionItems.map((item) => item.processId),
  );
  const processingItems = Array.from(activeProcessingByThread.values())
    .filter((item) => !attentionProcessIds.has(item.processId))
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    attentionItems,
    processingItems,
    processingCount: processingItems.length,
    failedCount: attentionItems.filter((item) => item.hasFailed).length,
    approvalCount: attentionItems.filter((item) => item.hasPendingApproval)
      .length,
  };
}
