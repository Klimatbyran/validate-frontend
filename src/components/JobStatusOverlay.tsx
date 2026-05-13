import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  XCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompaniesContext } from "@/contexts/CompaniesContext";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

type AttentionItem = {
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

type ProcessingItem = {
  key: string;
  companyName: string;
  year?: number;
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
    url?: string;
    sourceUrl?: string;
    data?: unknown;
    threadId?: unknown;
  }>;
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

function isGuessWikidataPendingApproval(
  job:
    | {
        queue?: string;
        data?: unknown;
      }
    | undefined,
): boolean {
  if (!job || job.queue !== "guessWikidata") return false;

  const data = job.data as
    | {
        approval?: { approved?: unknown; status?: unknown };
        needsApproval?: unknown;
      }
    | undefined;

  const approval = data?.approval;
  if (approval && typeof approval === "object") {
    if (approval.approved === false) return true;
    if (approval.status === "pending_approval") return true;
  }

  return data?.needsApproval === true;
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
  return (
    process.startedAt ||
    process.finishedAt ||
    Math.max(0, ...(process.jobs || []).map((job) => job.timestamp || 0))
  );
}

const LIST_MAX_HEIGHT_CLASS = "max-h-[17.5rem] overflow-y-auto pr-1";

export function JobStatusOverlay() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { companies, isQueueStatsLoading, isRefreshing } =
    useCompaniesContext();
  const [collapsed, setCollapsed] = useState(false);

  const summary = useMemo(() => {
    const attentionItems: AttentionItem[] = [];
    const processingItems: ProcessingItem[] = [];
    const latestProcessByReportKey = new Map<
      string,
      {
        companyName: string;
        year?: number;
        processId: string;
        threadId: string;
        status?: string;
        jobs: NonNullable<ProcessLike["jobs"]>;
        timestamp: number;
      }
    >();

    for (const company of companies) {
      const companyName =
        company.company || company.processes?.[0]?.company || t("jobstatus.na");
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
        const existing = latestProcessByReportKey.get(reportKey);
        if (!existing || existing.timestamp < timestamp) {
          latestProcessByReportKey.set(reportKey, {
            companyName,
            year: canonicalYear,
            processId: process.id,
            threadId: latestThreadId,
            status: process.status,
            jobs: process.jobs || [],
            timestamp,
          });
        }
      }
    }

    let processingCount = 0;
    for (const process of latestProcessByReportKey.values()) {
      if (process.status === "active") {
        processingCount += 1;
        processingItems.push({
          key: `${process.processId}:${process.threadId}`,
          companyName: process.companyName,
          year: process.year,
          threadId: process.threadId,
          timestamp: process.timestamp,
        });
      }

      const threadJobs = process.jobs.filter(
        (job) => resolveJobThreadId(job, process.threadId) === process.threadId,
      );
      const scopedJobs = threadJobs.length > 0 ? threadJobs : process.jobs;

      const failedCount = scopedJobs.filter(
        (job) => job.status === "failed",
      ).length;
      const latestWikidataJob = [...scopedJobs]
        .filter((job) => job.queue === "guessWikidata")
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

      const hasPendingApproval =
        isGuessWikidataPendingApproval(latestWikidataJob);
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
      const aSeverity = a.hasFailed ? 2 : a.hasPendingApproval ? 1 : 0;
      const bSeverity = b.hasFailed ? 2 : b.hasPendingApproval ? 1 : 0;
      if (aSeverity !== bSeverity) return bSeverity - aSeverity;
      return b.timestamp - a.timestamp;
    });

    processingItems.sort((a, b) => b.timestamp - a.timestamp);

    return {
      attentionItems,
      processingItems,
      processingCount,
      failedCount: attentionItems.filter((item) => item.hasFailed).length,
      approvalCount: attentionItems.filter((item) => item.hasPendingApproval)
        .length,
    };
  }, [companies, t]);

  const updatedAtLabel = useMemo(() => {
    if (isQueueStatsLoading) return t("jobstatus.overlayLoading");
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [isQueueStatsLoading, t, companies]);

  const isOnJobbstatus = location.pathname.startsWith("/jobbstatus");
  const currentParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const currentQ = (currentParams.get("q") || "").trim();
  const currentAttention = (currentParams.get("attention") || "").trim();

  const isItemActive = (
    threadId: string,
    processId: string,
    expectedAttention?: "failed" | "approval",
  ): boolean => {
    if (!isOnJobbstatus) return false;
    const matchesQ = currentQ === threadId || currentQ === processId;
    if (!matchesQ) return false;
    if (!expectedAttention) return true;
    return currentAttention === expectedAttention;
  };

  const navigateToOverlayItem = (
    threadId: string,
    processId: string,
    attention?: "failed" | "approval",
  ) => {
    const isActive = isItemActive(threadId, processId, attention);
    const next = new URLSearchParams(location.search);

    if (isActive) {
      next.delete("q");
      next.delete("attention");
    } else {
      next.set("q", threadId || processId);
      if (attention) {
        next.set("attention", attention);
      } else {
        next.delete("attention");
      }
    }

    const search = next.toString();
    navigate({
      pathname: "/jobbstatus",
      search: search ? `?${search}` : "",
    });
  };

  return (
    <aside className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
      <div
        className={cn(
          "border border-r-0 border-gray-03 bg-gray-04/95 shadow-xl backdrop-blur-sm rounded-l-xl overflow-hidden transition-[width] duration-200",
          collapsed ? "w-[min(88vw,14rem)]" : "w-[min(92vw,22rem)]",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-03/35 transition-colors"
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? t("jobstatus.overlayExpandAria")
              : t("jobstatus.overlayCollapseAria")
          }
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-01 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-03" />
              {t("jobstatus.overlayTitle")}
            </p>
            <p className="text-xs text-gray-02 mt-0.5 flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" />
              {t("jobstatus.overlayUpdatedAt", { time: updatedAtLabel })}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/50 bg-blue-300/10 px-2 py-0.5 text-gray-01">
                <Activity className="w-3 h-3 text-blue-03" />
                {t("jobstatus.overlayProcessingNow", {
                  count: summary.processingCount,
                })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-gray-01">
                <XCircle className="w-3 h-3 text-red-400" />
                {t("jobstatus.overlayFailedNow", {
                  count: summary.failedCount,
                })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-400/10 px-2 py-0.5 text-gray-01">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                {t("jobstatus.overlayApprovalNow", {
                  count: summary.approvalCount,
                })}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {(isQueueStatsLoading || isRefreshing) && (
              <Loader2 className="w-4 h-4 text-blue-03 animate-spin" />
            )}
            {collapsed ? (
              <ChevronLeft className="w-4 h-4 text-gray-01" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-01" />
            )}
          </div>
        </button>

        {!collapsed && (
          <div className="px-4 pb-4 pt-2 space-y-3 max-h-[58vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-red-400/40 bg-red-400/10 px-2 py-2">
                <div className="text-gray-02">
                  {t("jobstatus.overlayFailed")}
                </div>
                <div className="text-gray-01 text-base font-semibold leading-tight">
                  {summary.failedCount}
                </div>
              </div>
              <div className="rounded-md border border-orange-400/40 bg-orange-400/10 px-2 py-2">
                <div className="text-gray-02">
                  {t("jobstatus.overlayApproval")}
                </div>
                <div className="text-gray-01 text-base font-semibold leading-tight">
                  {summary.approvalCount}
                </div>
              </div>
            </div>

            {summary.processingItems.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-02">
                  {t("jobstatus.overlayProcessingList")}
                </p>
                <ul className={cn("space-y-1", LIST_MAX_HEIGHT_CLASS)}>
                  {summary.processingItems.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() =>
                          navigateToOverlayItem(item.threadId, item.threadId)
                        }
                        className={cn(
                          "w-full flex items-center justify-between gap-3 text-xs rounded-md border px-2 py-1.5 transition-colors text-left",
                          isItemActive(item.threadId, item.threadId)
                            ? "border-blue-300/70 bg-blue-300/20"
                            : "border-blue-300/30 bg-blue-300/10 hover:bg-blue-300/20",
                        )}
                      >
                        <span className="text-left min-w-0">
                          <span className="block text-gray-01 truncate">
                            {item.companyName}
                            {item.year ? ` (${item.year})` : ""}
                          </span>
                          <span className="block text-[11px] text-gray-02 truncate font-mono">
                            {item.threadId}
                          </span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1.5 text-gray-02 whitespace-nowrap">
                          {isItemActive(item.threadId, item.threadId) ? (
                            <Eye className="w-3.5 h-3.5 text-blue-03" />
                          ) : null}
                          <Activity className="w-3.5 h-3.5 text-blue-03" />
                          {t("jobstatus.overlayProcessingBadge")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {summary.attentionItems.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-02">
                  {t("jobstatus.overlayAttentionList")}
                </p>
                <ul className={cn("space-y-1", LIST_MAX_HEIGHT_CLASS)}>
                  {summary.attentionItems.map((item) => (
                    <li key={item.key}>
                      {(() => {
                        const attention = item.hasFailed
                          ? "failed"
                          : "approval";
                        const isActive = isItemActive(
                          item.threadId,
                          item.processId,
                          attention,
                        );
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              navigateToOverlayItem(
                                item.threadId,
                                item.processId,
                                attention,
                              )
                            }
                            className={cn(
                              "w-full flex items-center justify-between gap-3 text-xs rounded-md border px-2 py-1.5 transition-colors",
                              isActive
                                ? "border-blue-300/70 bg-blue-300/10"
                                : "border-gray-03/70 bg-gray-05/50 hover:bg-gray-03/35",
                            )}
                          >
                            <span className="text-left min-w-0">
                              <span className="block text-gray-01 truncate">
                                {item.companyName}
                                {item.year ? ` (${item.year})` : ""}
                              </span>
                              <span className="block text-[11px] text-gray-02 truncate font-mono">
                                {item.threadId || item.processId}
                              </span>
                            </span>
                            <span className="shrink-0 flex items-center gap-1.5 text-gray-02 whitespace-nowrap">
                              {isActive ? (
                                <Eye className="w-3.5 h-3.5 text-blue-03" />
                              ) : null}
                              {item.hasFailed ? (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              ) : null}
                              {item.hasPendingApproval ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                              ) : null}
                              <span>
                                {item.hasFailed && item.hasPendingApproval
                                  ? t("jobstatus.overlayFailedAndApproval", {
                                      failed: item.failedCount,
                                    })
                                  : item.hasFailed
                                    ? t("jobstatus.overlayFailedOnly", {
                                        failed: item.failedCount,
                                      })
                                    : t("jobstatus.overlayApprovalOnly")}
                              </span>
                            </span>
                          </button>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-02">
                {t("jobstatus.overlayAttentionIdle")}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
