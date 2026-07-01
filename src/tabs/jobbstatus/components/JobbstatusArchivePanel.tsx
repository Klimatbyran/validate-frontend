import { useCallback, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";
import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { JobbstatusArchiveRunCard } from "./JobbstatusArchiveRunCard";
import { JobbstatusArchiveQueueAttemptsDialog } from "./JobbstatusArchiveQueueAttemptsDialog";
import { JobbstatusArchiveDetailDialog } from "./JobbstatusArchiveDetailDialog";
import { BatchFilterDropdown } from "./BatchFilterDropdown";
import { useArchiveRunsList } from "../hooks/useArchiveRunsList";
import type { ArchiveRunDetail } from "../lib/archive-types";
import type { ArchiveJobLike } from "../lib/archive-run-jobs";
import {
  ARCHIVE_FILTER_CARD_CLASS,
  ARCHIVE_TEXT_INPUT_CLASS,
} from "../lib/archive-filter-styles";

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
    batchFilterIds,
    setBatchFilterIds,
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

  const [queueHistory, setQueueHistory] = useState<{
    queueName: string;
    queueLabel: string;
    jobs: ArchiveJobLike[];
  } | null>(null);

  const detailFetchSeq = useRef(0);
  const detailAbortRef = useRef<AbortController | null>(null);

  const openQueueHistory = useCallback(
    (queueName: string, queueLabel: string, jobs: ArchiveJobLike[]) => {
      setQueueHistory({ queueName, queueLabel, jobs: [...jobs] });
    },
    [],
  );

  const openDetail = async (threadId: string) => {
    detailAbortRef.current?.abort();
    const ac = new AbortController();
    detailAbortRef.current = ac;
    const seq = ++detailFetchSeq.current;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRun(null);
    setDetailError(null);
    try {
      const res = await garboAuthFetch(
        getGarboQueueArchiveUrl(`/runs/${encodeURIComponent(threadId)}`),
        { signal: ac.signal },
      );
      if (seq !== detailFetchSeq.current) return;
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
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (seq !== detailFetchSeq.current) return;
      setDetailRun(null);
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      if (seq === detailFetchSeq.current) {
        setDetailLoading(false);
      }
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-02 max-w-3xl">
        {t("jobstatus.archiveIntro")}
      </p>

      <div className={`${ARCHIVE_FILTER_CARD_CLASS} gap-3`}>
        <div className="flex-1 min-w-[12rem] max-w-md">
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
            className={`w-full ${ARCHIVE_TEXT_INPUT_CLASS}`}
          />
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
        <div className="w-full max-w-xs shrink-0 min-w-[10rem] flex flex-col justify-end">
          <span className="text-xs font-medium text-gray-02 block mb-1">
            {t("jobstatus.archiveBatchFilterLabel")}
          </span>
          <BatchFilterDropdown
            existingBatches={batchesFromGarbo}
            batchesLoading={batchesLoading}
            selectedBatchIds={batchFilterIds}
            onBatchFilterChange={setBatchFilterIds}
            triggerLabel={t("jobstatus.archiveBatchFilterLabel")}
            ariaLabel={t("jobstatus.archiveBatchFilterLabel")}
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-02 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t("jobstatus.archiveLoading")}
        </div>
      )}

      {!loading && error && (
        <Callout
          variant="error"
          title={t("jobstatus.archiveErrorTitle")}
          description={t("jobstatus.archiveError", { message: error })}
          icon={<AlertCircle className="w-5 h-5" />}
        />
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
            detailAbortRef.current?.abort();
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
