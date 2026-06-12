import type { ArchiveRunSummary } from "@/tabs/jobbstatus/lib/archive-types";
import { isTerminalArchiveStatus } from "@/tabs/jobbstatus/lib/archive-run-jobs";
import { isWikidataIdPresent } from "@/tabs/registry/lib/registry-table-utils";

/** Best-effort catalog year from a report PDF URL. */
export function parseReportYearFromUrl(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const matches = raw.match(/(?:19|20)\d{2}/g);
  if (!matches?.length) return null;
  const years = matches
    .map((token) => Number(token))
    .filter((year) => year >= 2000 && year <= 2030);
  if (!years.length) return null;
  return String(Math.max(...years));
}

export function normalizeReportUrl(url: string | null | undefined): string {
  return (url ?? "").trim().replace(/\/+$/, "").toLowerCase();
}

export function urlsLikelyMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeReportUrl(a);
  const right = normalizeReportUrl(b);
  if (!left || !right) return false;
  return left === right;
}

export function rowKeyForArchiveRun(run: ArchiveRunSummary): string | null {
  const reportYear = parseReportYearFromUrl(run.pdfUrl);
  if (!reportYear) return null;
  const idPart = isWikidataIdPresent(run.wikidataId)
    ? run.wikidataId!.trim().toUpperCase()
    : (run.companyName ?? "").trim().toLowerCase() || "unknown";
  return `${idPart}:${reportYear}`;
}

function runStartedAtMs(run: ArchiveRunSummary): number {
  return new Date(run.startedAt).getTime();
}

function pickLatestRun(runs: ArchiveRunSummary[]): ArchiveRunSummary | null {
  if (runs.length === 0) return null;
  return [...runs].sort((a, b) => runStartedAtMs(b) - runStartedAtMs(a))[0];
}

export type ArchiveRunIndex = {
  byRowKey: Map<string, ArchiveRunSummary[]>;
  byPdfUrl: Map<string, ArchiveRunSummary[]>;
};

export function buildArchiveRunIndex(
  runs: ArchiveRunSummary[],
): ArchiveRunIndex {
  const byRowKey = new Map<string, ArchiveRunSummary[]>();
  const byPdfUrl = new Map<string, ArchiveRunSummary[]>();

  for (const run of runs) {
    const rowKey = rowKeyForArchiveRun(run);
    if (rowKey) {
      const bucket = byRowKey.get(rowKey) ?? [];
      bucket.push(run);
      byRowKey.set(rowKey, bucket);
    }

    const normalizedUrl = normalizeReportUrl(run.pdfUrl);
    if (normalizedUrl) {
      const bucket = byPdfUrl.get(normalizedUrl) ?? [];
      bucket.push(run);
      byPdfUrl.set(normalizedUrl, bucket);
    }
  }

  return { byRowKey, byPdfUrl };
}

export function findLatestArchiveRunForRow(input: {
  index: ArchiveRunIndex;
  rowKey: string;
  registryUrl?: string | null;
  runUrl?: string | null;
}): ArchiveRunSummary | null {
  const candidates = new Map<string, ArchiveRunSummary>();

  for (const run of input.index.byRowKey.get(input.rowKey) ?? []) {
    candidates.set(run.threadId, run);
  }

  for (const url of [input.registryUrl, input.runUrl]) {
    if (!url) continue;
    const normalized = normalizeReportUrl(url);
    for (const run of input.index.byPdfUrl.get(normalized) ?? []) {
      candidates.set(run.threadId, run);
    }
  }

  return pickLatestRun([...candidates.values()]);
}

export function archiveRunHasFailedJobs(run: ArchiveRunSummary): boolean {
  if (run.status.toLowerCase() === "failed") return true;
  return (run.jobs ?? []).some(
    (job) =>
      isTerminalArchiveStatus(job.status) &&
      job.status.toLowerCase() === "failed",
  );
}

export function collectArchiveRunErrorLines(run: ArchiveRunSummary): string[] {
  const lines: string[] = [];
  if (run.status.toLowerCase() === "failed") {
    lines.push(`Run ${run.threadId} failed.`);
  }
  for (const job of run.jobs ?? []) {
    if (job.status.toLowerCase() !== "failed") continue;
    lines.push(
      job.failedReason
        ? `${job.queueName}: ${job.failedReason}`
        : `${job.queueName}: failed`,
    );
  }
  return lines;
}
