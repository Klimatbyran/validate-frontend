/** Garbo queue-archive API shapes (Jobbstatus Archive). */

export type ArchiveRunJobRow = {
  jobId: string;
  queueName: string;
  status: string;
  failedReason: string | null;
  startedAt: string | null;
  finishedAt: string;
};

export type ArchiveRunJob = ArchiveRunJobRow & { id: string };

export type ArchiveRunSummary = {
  id: string;
  threadId: string;
  pdfUrl: string;
  companyName: string | null;
  wikidataId: string | null;
  companyReportId?: string | null;
  batch?: { id: string; batchName: string } | null;
  status: string;
  startedAt: string;
  updatedAt: string;
  jobs: ArchiveRunJobRow[];
};

/** GET /runs/:threadId — full job rows include `id`. */
export type ArchiveRunDetail = Omit<ArchiveRunSummary, "jobs"> & {
  jobs: ArchiveRunJob[];
};

export type ArchiveRunsListResponse = {
  total: number;
  page: number;
  pageSize: number;
  runs: ArchiveRunSummary[];
};

/** Alias: expandable list card uses the same shape as a list API run. */
export type ArchiveRunCardModel = ArchiveRunSummary;
