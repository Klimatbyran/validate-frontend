import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";
import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { getQueueDisplayName } from "@/lib/workflow-config";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { JobbstatusArchiveRunCard } from "./JobbstatusArchiveRunCard";
import { JobbstatusArchiveQueueAttemptsDialog } from "./JobbstatusArchiveQueueAttemptsDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type ArchiveRunJob = {
  id: string;
  jobId: string;
  queueName: string;
  status: string;
  failedReason: string | null;
  startedAt: string | null;
  finishedAt: string;
};

type ArchiveRunSummary = {
  id: string;
  threadId: string;
  pdfUrl: string;
  companyName: string | null;
  wikidataId: string | null;
  batch?: { id: string; batchName: string } | null;
  status: string;
  startedAt: string;
  updatedAt: string;
  jobs: Pick<
    ArchiveRunJob,
    "jobId" | "queueName" | "status" | "failedReason" | "startedAt" | "finishedAt"
  >[];
};

type ListResponse = {
  total: number;
  page: number;
  pageSize: number;
  runs: ArchiveRunSummary[];
};

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

export function JobbstatusArchivePanel({
  batchesFromGarbo,
  batchesLoading,
}: {
  batchesFromGarbo: GarboBatchOption[];
  batchesLoading: boolean;
}) {
  const { t, localeIntl } = useI18n();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRun, setDetailRun] = useState<(ArchiveRunSummary & { jobs: ArchiveRunJob[] }) | null>(
    null,
  );
  /** Selected filter: "" | Garbo `Batch.id` | `ext:<pipeline batch string>` for manual keys. */
  const [batchFilterValue, setBatchFilterValue] = useState("");
  const [dbBatches, setDbBatches] = useState<GarboBatchOption[]>([]);
  /** Pipeline batch strings the user added (not yet in `dbBatches` or for filtering before a row exists). */
  const [manualBatches, setManualBatches] = useState<string[]>([]);
  const [customBatchInput, setCustomBatchInput] = useState("");
  const [batchOptionsLoading, setBatchOptionsLoading] = useState(true);

  const [queueHistory, setQueueHistory] = useState<{
    queueName: string;
    queueLabel: string;
    jobs: Array<
      | ArchiveRunJob
      | (ArchiveRunSummary["jobs"][number] & { id?: string })
    >;
  } | null>(null);

  const pageSize = 30;

  const openQueueHistory = useCallback(
    (
      queueName: string,
      queueLabel: string,
      jobs: Array<ArchiveRunJob | ArchiveRunSummary["jobs"][number]>,
    ) => {
      setQueueHistory({ queueName, queueLabel, jobs: [...jobs] });
    },
    [],
  );

  useEffect(() => {
    setDbBatches(batchesFromGarbo);
    setBatchOptionsLoading(batchesLoading);
  }, [batchesFromGarbo, batchesLoading]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (qApplied.trim()) params.set("q", qApplied.trim());
      if (batchFilterValue.startsWith("ext:")) {
        const key = batchFilterValue.slice(4).trim();
        if (key) params.set("batchName", key);
      } else if (batchFilterValue.trim()) {
        params.set("batchDbId", batchFilterValue.trim());
      }
      const res = await garboAuthFetch(getGarboQueueArchiveUrl(`/runs?${params.toString()}`));
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, qApplied, batchFilterValue]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (threadId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRun(null);
    try {
      const res = await garboAuthFetch(
        getGarboQueueArchiveUrl(`/runs/${encodeURIComponent(threadId)}`),
      );
      if (!res.ok) {
        setDetailRun(null);
        return;
      }
      const json = (await res.json()) as ArchiveRunSummary & { jobs: ArchiveRunJob[] };
      setDetailRun(json);
    } finally {
      setDetailLoading(false);
    }
  };

  const applySearch = () => {
    setPage(1);
    setQApplied(qInput);
  };

  const addCustomBatchFilter = () => {
    const key = customBatchInput.trim();
    if (!key) return;
    const inDb = dbBatches.some((b) => b.batchName === key);
    if (!inDb && !manualBatches.includes(key)) {
      setManualBatches((m) => [...m, key]);
    }
    const dbHit = dbBatches.find((b) => b.batchName === key);
    setBatchFilterValue(dbHit ? dbHit.id : `ext:${key}`);
    setCustomBatchInput("");
    setPage(1);
  };

  const mergedBatchSelectOptions = (() => {
    const fromDb = dbBatches.map((b) => ({ value: b.id, label: b.batchName }));
    const manualOnly = manualBatches.filter(
      (k) => !dbBatches.some((b) => b.batchName === k),
    );
    const fromManual = manualOnly.map((k) => ({ value: `ext:${k}`, label: k }));
    return [...fromDb, ...fromManual];
  })();

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
          <label className="text-xs font-medium text-gray-02 block mb-1" htmlFor="archive-batch-filter">
            {t("jobstatus.archiveBatchFilterLabel")}
          </label>
          <select
            id="archive-batch-filter"
            value={batchFilterValue}
            disabled={batchOptionsLoading}
            onChange={(e) => {
              setBatchFilterValue(e.target.value);
              setPage(1);
            }}
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
            <label className="text-[11px] font-medium text-gray-02" htmlFor="archive-batch-custom">
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
              <Button type="button" variant="secondary" size="sm" className="shrink-0 text-xs" onClick={addCustomBatchFilter}>
                {t("jobstatus.archiveBatchAdd")}
              </Button>
            </div>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={applySearch}>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("jobstatus.archiveDetailTitle")}</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex items-center gap-2 text-gray-02 py-6">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("jobstatus.archiveLoading")}
            </div>
          )}
          {!detailLoading && detailRun && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 text-gray-02">
                <div>
                  <span className="font-medium text-gray-01">{t("jobstatus.archiveThread")}:</span>{" "}
                  <span className="font-mono break-all">{detailRun.threadId}</span>
                </div>
                {detailRun.companyName ? (
                  <div>
                    <span className="font-medium text-gray-01">{t("jobstatus.archiveCompany")}:</span>{" "}
                    {detailRun.companyName}
                  </div>
                ) : null}
                {detailRun.wikidataId ? (
                  <div>
                    <span className="font-medium text-gray-01">{t("jobstatus.archiveWikidata")}:</span>{" "}
                    {detailRun.wikidataId}
                  </div>
                ) : null}
                {detailRun.batch?.batchName ? (
                  <div>
                    <span className="font-medium text-gray-01">{t("jobstatus.batch")}:</span>{" "}
                    <span className="font-mono">{detailRun.batch.batchName}</span>
                  </div>
                ) : null}
                <div>
                  <span className="font-medium text-gray-01">{t("jobstatus.archivePdfUrl")}:</span>{" "}
                  <a
                    href={detailRun.pdfUrl}
                    className="text-blue-04 hover:underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {detailRun.pdfUrl}
                  </a>
                </div>
                <div>
                  {t("jobstatus.archiveStatus")}: {detailRun.status} ·{" "}
                  {formatWhen(detailRun.startedAt, localeIntl)}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-01 mb-2">
                  {t("jobstatus.archiveJobsHeading")}
                </h4>
                <div className="border border-gray-03/40 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-04/50 text-gray-02">
                      <tr>
                        <th className="p-2 font-medium">{t("jobstatus.archiveColQueue")}</th>
                        <th className="p-2 font-medium">{t("jobstatus.archiveColJobId")}</th>
                        <th className="p-2 font-medium">{t("jobstatus.archiveColStatus")}</th>
                        <th className="p-2 font-medium">{t("jobstatus.archiveColFinished")}</th>
                        <th className="p-2 font-medium w-[1%] whitespace-nowrap">
                          {t("jobstatus.archiveColActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRun.jobs.map((j) => {
                        const queueKey = `jobstatus.queues.${j.queueName}`;
                        const queueLabel =
                          t(queueKey) !== queueKey ? t(queueKey) : getQueueDisplayName(j.queueName);
                        return (
                          <tr
                            key={`${j.jobId}-${j.queueName}-${j.finishedAt}`}
                            className="border-t border-gray-03/30"
                          >
                            <td className="p-2 font-mono">{j.queueName}</td>
                            <td className="p-2 font-mono break-all">{j.jobId}</td>
                            <td className="p-2">{j.status}</td>
                            <td className="p-2 whitespace-nowrap">
                              {formatWhen(j.finishedAt, localeIntl)}
                            </td>
                            <td className="p-2 align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto min-w-0 max-w-none px-1 py-0.5 text-xs text-blue-04 hover:text-blue-03 hover:bg-transparent"
                                onClick={() =>
                                  openQueueHistory(j.queueName, queueLabel, detailRun.jobs)
                                }
                              >
                                {t("jobstatus.archiveViewStepAttempts")}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {detailRun.jobs.some((j) => j.failedReason) && (
                  <p className="text-xs text-gray-02 mt-2">{t("jobstatus.archiveFailedHint")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
