import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";
import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { JobbstatusArchiveRunCard } from "./JobbstatusArchiveRunCard";
import { JobbstatusArchiveQueueAttemptsDialog } from "./JobbstatusArchiveQueueAttemptsDialog";
import { JobbstatusArchiveDetailDialog } from "./JobbstatusArchiveDetailDialog";
import { useArchiveRunsList } from "../hooks/useArchiveRunsList";
import type { ArchiveRunDetail } from "../lib/archive-types";
import type { ArchiveJobLike } from "../lib/archive-run-jobs";

export function JobbstatusArchivePanel({
  batchesFromGarbo,
  batchesLoading,
}: {
  batchesFromGarbo: GarboBatchOption[];
  batchesLoading: boolean;
}) {
  const { t } = useI18n();
  const {
    page,
    setPage,
    qInput,
    setQInput,
    batchFilterValue,
    setBatchFilterValue,
    data,
    loading,
    error,
    applySearch,
    pageSize,
  } = useArchiveRunsList();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRun, setDetailRun] = useState<ArchiveRunDetail | null>(null);

  const [manualBatches, setManualBatches] = useState<string[]>([]);
  const [customBatchInput, setCustomBatchInput] = useState("");

  const [queueHistory, setQueueHistory] = useState<{
    queueName: string;
    queueLabel: string;
    jobs: ArchiveJobLike[];
  } | null>(null);

  const openQueueHistory = useCallback(
    (queueName: string, queueLabel: string, jobs: ArchiveJobLike[]) => {
      setQueueHistory({ queueName, queueLabel, jobs: [...jobs] });
    },
    [],
  );

  const mergedBatchSelectOptions = useMemo(() => {
    const fromDb = batchesFromGarbo.map((b) => ({
      value: b.id,
      label: b.batchName,
    }));
    const manualOnly = manualBatches.filter(
      (k) => !batchesFromGarbo.some((b) => b.batchName === k),
    );
    const fromManual = manualOnly.map((k) => ({
      value: `ext:${k}`,
      label: k,
    }));
    return [...fromDb, ...fromManual];
  }, [batchesFromGarbo, manualBatches]);

  const openDetail = async (threadId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRun(null);
    setDetailError(null);
    try {
      const res = await garboAuthFetch(
        getGarboQueueArchiveUrl(`/runs/${encodeURIComponent(threadId)}`),
      );
      if (!res.ok) {
        const text = await res.text();
        setDetailRun(null);
        setDetailError(text || `${res.status} ${res.statusText}`);
        return;
      }
      const json = (await res.json()) as ArchiveRunDetail;
      setDetailRun(json);
      setDetailError(null);
    } catch (e) {
      setDetailRun(null);
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const addCustomBatchFilter = () => {
    const key = customBatchInput.trim();
    if (!key) return;
    const inDb = batchesFromGarbo.some((b) => b.batchName === key);
    if (!inDb && !manualBatches.includes(key)) {
      setManualBatches((m) => [...m, key]);
    }
    const dbHit = batchesFromGarbo.find((b) => b.batchName === key);
    setBatchFilterValue(dbHit ? dbHit.id : `ext:${key}`);
    setCustomBatchInput("");
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-02 max-w-3xl">{t("jobstatus.archiveIntro")}</p>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:flex-wrap">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-02 block mb-1">
            {t("jobstatus.archiveSearchLabel")}
          </label>
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder={t("jobstatus.archiveSearchPlaceholder")}
            className="w-full max-w-md py-2 px-3 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
          />
        </div>
        <div className="w-full max-w-xs shrink-0 space-y-2">
          <label
            className="text-xs font-medium text-gray-02 block mb-1"
            htmlFor="archive-batch-filter"
          >
            {t("jobstatus.archiveBatchFilterLabel")}
          </label>
          <select
            id="archive-batch-filter"
            value={batchFilterValue}
            disabled={batchesLoading}
            onChange={(e) => setBatchFilterValue(e.target.value)}
            className="w-full py-2 px-3 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03 disabled:opacity-60"
          >
            <option value="">{t("jobstatus.archiveBatchFilterAll")}</option>
            {mergedBatchSelectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-medium text-gray-02"
              htmlFor="archive-batch-custom"
            >
              {t("jobstatus.archiveBatchCustomLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="archive-batch-custom"
                type="text"
                value={customBatchInput}
                onChange={(e) => setCustomBatchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustomBatchFilter();
                }}
                placeholder={t("jobstatus.archiveBatchCustomPlaceholder")}
                className="flex-1 min-w-0 py-1.5 px-2 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-xs placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 text-xs"
                onClick={addCustomBatchFilter}
              >
                {t("jobstatus.archiveBatchAdd")}
              </Button>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={applySearch}
        >
          {t("jobstatus.archiveSearchButton")}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-02 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t("jobstatus.archiveLoading")}
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-pink-03 border border-pink-03/30 rounded-lg p-4">
          {t("jobstatus.archiveError", { message: error })}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="text-sm text-gray-02">
            {t("jobstatus.archiveShowing", {
              from: data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1,
              to: Math.min(data.page * data.pageSize, data.total),
              total: data.total,
            })}
          </div>

          {data.runs.length === 0 ? (
            <p className="text-gray-02 py-6">{t("jobstatus.archiveEmpty")}</p>
          ) : (
            <div className="space-y-4">
              {data.runs.map((run, idx) => (
                <JobbstatusArchiveRunCard
                  key={run.id}
                  run={run}
                  positionInList={(data.page - 1) * data.pageSize + idx + 1}
                  onOpenDetails={(threadId) => void openDetail(threadId)}
                  onOpenQueueAttempts={(queueName, queueLabel, jobs) =>
                    openQueueHistory(queueName, queueLabel, jobs)
                  }
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("jobstatus.archivePrev")}
              </Button>
              <span className="text-sm text-gray-02">
                {t("jobstatus.archivePage", { page, totalPages })}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("jobstatus.archiveNext")}
              </Button>
            </div>
          )}
        </>
      )}

      <JobbstatusArchiveDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailError(null);
            setDetailRun(null);
          }
        }}
        detailLoading={detailLoading}
        detailError={detailError}
        detailRun={detailRun}
        onOpenQueueAttempts={(queueName, queueLabel, jobs) =>
          openQueueHistory(queueName, queueLabel, jobs)
        }
      />

      <JobbstatusArchiveQueueAttemptsDialog
        open={queueHistory !== null}
        onOpenChange={(open) => {
          if (!open) setQueueHistory(null);
        }}
        queueName={queueHistory?.queueName ?? ""}
        queueLabel={queueHistory?.queueLabel ?? ""}
        jobs={queueHistory?.jobs ?? []}
      />
    </div>
  );
}
