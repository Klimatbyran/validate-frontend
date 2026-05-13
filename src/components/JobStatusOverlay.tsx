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
import { useCompaniesContext } from "@/contexts/companies-context";
import { useI18n } from "@/contexts/I18nContext";
import { buildJobStatusOverlaySummary } from "@/lib/job-status-overlay-utils";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_ITEMS = 5;

export function JobStatusOverlay() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { companies, isQueueStatsLoading, isRefreshing } =
    useCompaniesContext();
  const [collapsed, setCollapsed] = useState(false);

  const summary = useMemo(
    () => buildJobStatusOverlaySummary(companies, t("jobstatus.na")),
    [companies, t],
  );
  const visibleProcessingItems = useMemo(
    () => summary.processingItems.slice(0, MAX_VISIBLE_ITEMS),
    [summary.processingItems],
  );
  const visibleAttentionItems = useMemo(
    () => summary.attentionItems.slice(0, MAX_VISIBLE_ITEMS),
    [summary.attentionItems],
  );

  const updatedAtLabel = useMemo(() => {
    if (isQueueStatsLoading) return t("jobstatus.overlayLoading");
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [isQueueStatsLoading, t]);

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
                {summary.processingItems.length > MAX_VISIBLE_ITEMS ? (
                  <p className="text-[11px] text-gray-02">
                    {t("jobstatus.overlayShowingOutOf", {
                      shown: visibleProcessingItems.length,
                      total: summary.processingItems.length,
                    })}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {visibleProcessingItems.map((item) => (
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
                {summary.attentionItems.length > MAX_VISIBLE_ITEMS ? (
                  <p className="text-[11px] text-gray-02">
                    {t("jobstatus.overlayShowingOutOf", {
                      shown: visibleAttentionItems.length,
                      total: summary.attentionItems.length,
                    })}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {visibleAttentionItems.map((item) => (
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
