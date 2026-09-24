import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_RUN_ONLY, type RunOnlyWorkerId } from "@/lib/run-only-workers";
import { fetchReportTypes } from "@/tabs/editor/lib/report-types-api";
import type { ReportType } from "@/tabs/editor/lib/types";
import { fetchCoverageLists } from "@/tabs/overview/lib/coverage-api";
import type { CoverageListSummary } from "@/tabs/overview/lib/coverage-types";
import { fetchRegistryBatches } from "@/tabs/registry/lib/registry-api";
import { useTagOptions } from "@/tabs/upload/hooks/useTagOptions";
import { UploadRunOptions } from "@/tabs/upload/components/UploadRunOptions";
import { useBatches } from "@/hooks/useBatches";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";
import { resolvePipelineBatchId } from "@/lib/resolve-pipeline-batch-id";
import {
  fetchPipelineAutoRunStatus,
  patchPipelineAutoRun,
  type PipelineAutoRunStatus,
} from "@/tabs/upload/lib/pipeline-auto-run-api";

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function MultiCheckList({
  label,
  items,
  selected,
  onChange,
  loading,
  emptyLabel,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  emptyLabel: string;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-01">{label}</p>
      {loading ? (
        <p className="text-xs text-gray-02">…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-02">{emptyLabel}</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-md border border-gray-03 bg-gray-04/40 p-2 space-y-1">
          {items.map((item) => {
            const checked = selectedSet.has(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center gap-2 text-sm text-gray-01 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="rounded border-gray-03"
                  checked={checked}
                  onChange={() => {
                    onChange(
                      checked
                        ? selected.filter((id) => id !== item.id)
                        : [...selected, item.id],
                    );
                  }}
                />
                <span className="truncate">{item.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AutoRunPanel() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PipelineAutoRunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Skip rewriting form fields on status polls while the operator is editing. */
  const formDirtyRef = useRef(false);
  const markFormDirty = useCallback(() => {
    formDirtyRef.current = true;
  }, []);

  const [reportTypeIds, setReportTypeIds] = useState<string[]>([]);
  const [registryBatchIds, setRegistryBatchIds] = useState<string[]>([]);
  const [coverageListIds, setCoverageListIds] = useState<string[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [forceReindex, setForceReindex] = useState(false);
  const [requireEmissionsPresence, setRequireEmissionsPresence] =
    useState(true);
  const [runAllWorkers, setRunAllWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] =
    useState<RunOnlyWorkerId[]>(DEFAULT_RUN_ONLY);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [batchDropdownChoice, setBatchDropdownChoice] = useState("");
  const [customBatchName, setCustomBatchName] = useState("");

  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [reportTypesLoading, setReportTypesLoading] = useState(true);
  const [coverageLists, setCoverageLists] = useState<CoverageListSummary[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [registryBatches, setRegistryBatches] = useState<
    { id: string; batchName: string }[]
  >([]);
  const [registryBatchesLoading, setRegistryBatchesLoading] = useState(true);

  const {
    batches: existingBatches,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches();
  const {
    tagOptions,
    loading: tagsLoading,
    error: tagsError,
  } = useTagOptions();

  const applyFormFromStatus = useCallback((next: PipelineAutoRunStatus) => {
    setReportTypeIds(next.filters.reportTypeIds ?? []);
    setRegistryBatchIds(next.filters.registryBatchIds ?? []);
    setCoverageListIds(next.filters.coverageListIds ?? []);
    setAutoApprove(next.runOptions.autoApprove ?? true);
    setForceReindex(next.runOptions.forceReindex ?? false);
    setRequireEmissionsPresence(
      next.runOptions.requireEmissionsPresence ?? true,
    );
    const runOnly = next.runOptions.runOnly;
    if (runOnly && runOnly.length > 0) {
      setRunAllWorkers(false);
      setSelectedWorkers(runOnly as RunOnlyWorkerId[]);
    } else {
      setRunAllWorkers(true);
      setSelectedWorkers(DEFAULT_RUN_ONLY);
    }
    setSelectedTags(next.runOptions.tags ?? []);
    if (next.runOptions.batchId) {
      setBatchDropdownChoice(next.runOptions.batchId);
    } else {
      setBatchDropdownChoice("");
    }
    formDirtyRef.current = false;
  }, []);

  const applyStatus = useCallback(
    (next: PipelineAutoRunStatus) => {
      setStatus(next);
      applyFormFromStatus(next);
    },
    [applyFormFromStatus],
  );

  const refresh = useCallback(
    async (opts?: { syncForm?: boolean }) => {
      setError(null);
      try {
        const next = await fetchPipelineAutoRunStatus();
        setStatus(next);
        // Polls must not wipe unsaved edits; initial load / post-save sync form.
        if (opts?.syncForm || !formDirtyRef.current) {
          applyFormFromStatus(next);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : t("upload.unknownError");
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [applyFormFromStatus, t],
  );

  useEffect(() => {
    void refresh({ syncForm: true });
    const id = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    setReportTypesLoading(true);
    void fetchReportTypes()
      .then(setReportTypes)
      .catch(() => setReportTypes([]))
      .finally(() => setReportTypesLoading(false));

    setCoverageLoading(true);
    void fetchCoverageLists()
      .then((res) => setCoverageLists(res.lists))
      .catch(() => setCoverageLists([]))
      .finally(() => setCoverageLoading(false));

    setRegistryBatchesLoading(true);
    void fetchRegistryBatches()
      .then(setRegistryBatches)
      .catch(() => setRegistryBatches([]))
      .finally(() => setRegistryBatchesLoading(false));
  }, []);

  const handleWorkerToggle = useCallback(
    (workerId: RunOnlyWorkerId, checked: boolean) => {
      markFormDirty();
      setSelectedWorkers((prev) =>
        checked ? [...prev, workerId] : prev.filter((id) => id !== workerId),
      );
    },
    [markFormDirty],
  );

  const buildPatchOptions = useCallback(async () => {
    const runOnly =
      !runAllWorkers && selectedWorkers.length > 0
        ? selectedWorkers
        : undefined;

    let batchId: string | undefined;
    if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
      if (!customBatchName.trim()) {
        throw new Error(t("upload.batchNameRequired"));
      }
      batchId = await resolvePipelineBatchId({
        batchDropdownChoice,
        customBatchName,
      });
    } else if (batchDropdownChoice) {
      batchId = batchDropdownChoice;
    }

    return {
      autoApprove,
      forceReindex,
      requireEmissionsPresence,
      ...(runOnly ? { runOnly } : { runOnly: [] as string[] }),
      tags: selectedTags,
      batchId,
    };
  }, [
    autoApprove,
    forceReindex,
    requireEmissionsPresence,
    runAllWorkers,
    selectedWorkers,
    selectedTags,
    batchDropdownChoice,
    customBatchName,
    t,
  ]);

  const saveConfig = useCallback(
    async (extra?: { enabled?: boolean }) => {
      if (!runAllWorkers && selectedWorkers.length === 0) {
        toast.error(t("upload.selectAtLeastOneWorker"));
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const runOptions = await buildPatchOptions();
        const next = await patchPipelineAutoRun({
          ...(extra?.enabled !== undefined ? { enabled: extra.enabled } : {}),
          maxConcurrent: 1,
          filters: {
            reportTypeIds,
            registryBatchIds,
            coverageListIds,
          },
          runOptions,
          ...(extra?.enabled === true ? { resetFailureCounters: true } : {}),
        });
        applyStatus(next);
        if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
          refetchBatches();
        }
        toast.success(t("upload.autoRun.saved"));
      } catch (e) {
        const message =
          e instanceof Error ? e.message : t("upload.unknownError");
        setError(message);
        toast.error(t("upload.autoRun.saveError", { message }));
      } finally {
        setSaving(false);
      }
    },
    [
      runAllWorkers,
      selectedWorkers,
      reportTypeIds,
      registryBatchIds,
      coverageListIds,
      buildPatchOptions,
      applyStatus,
      batchDropdownChoice,
      refetchBatches,
      t,
    ],
  );

  const toggleEnabled = useCallback(async () => {
    const nextEnabled = !(status?.enabled ?? false);
    if (
      nextEnabled &&
      reportTypeIds.length === 0 &&
      registryBatchIds.length === 0 &&
      coverageListIds.length === 0
    ) {
      const ok = window.confirm(t("upload.autoRun.confirmEnableNoFilters"));
      if (!ok) return;
    }
    await saveConfig({ enabled: nextEnabled });
  }, [
    saveConfig,
    status?.enabled,
    reportTypeIds.length,
    registryBatchIds.length,
    coverageListIds.length,
    t,
  ]);

  if (loading && !status) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner label={t("common.loading")} />
      </div>
    );
  }

  const enabled = status?.enabled ?? false;
  const pausedReason = status?.pausedReason;
  const disabledReason = status?.disabledReason;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-03 bg-gray-04/50 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-01">
              {t("upload.autoRun.title")}
            </h2>
            <p className="text-sm text-gray-02">
              {t("upload.autoRun.description")}
            </p>
            <p className="text-xs text-gray-02">
              {t("upload.autoRun.doclingHint")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md",
                enabled
                  ? pausedReason
                    ? "bg-orange-03/20 text-orange-03"
                    : "bg-green-03/20 text-green-03"
                  : "bg-gray-03 text-gray-02",
              )}
            >
              {enabled
                ? pausedReason
                  ? t("upload.autoRun.statusPaused")
                  : t("upload.autoRun.statusOn")
                : t("upload.autoRun.statusOff")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={() => void toggleEnabled()}
              className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                enabled ? "bg-green-03" : "bg-gray-03",
                saving && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                  enabled ? "translate-x-8" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>

        {(pausedReason || disabledReason || status?.lastError || error) && (
          <div className="rounded-md border border-orange-03/40 bg-orange-03/10 px-3 py-2 text-sm text-orange-03 space-y-1">
            {pausedReason === "docling_unreachable" && (
              <p>{t("upload.autoRun.pausedDocling")}</p>
            )}
            {disabledReason === "docling_failures" && (
              <p>{t("upload.autoRun.disabledDocling")}</p>
            )}
            {disabledReason === "report_failures" && (
              <p>{t("upload.autoRun.disabledReports")}</p>
            )}
            {(status?.lastError || error) && (
              <p className="text-xs opacity-90">{status?.lastError || error}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat
            label={t("upload.autoRun.remaining")}
            value={
              status?.remainingEstimate != null
                ? String(status.remainingEstimate)
                : "—"
            }
          />
          <Stat
            label={t("upload.autoRun.active")}
            value={String(status?.activelyProcessing ?? 0)}
          />
          <Stat
            label={t("upload.autoRun.parked")}
            value={String(status?.parkedOnApproval ?? 0)}
          />
          <Stat
            label={t("upload.autoRun.docling")}
            value={
              status?.doclingReachable == null
                ? "—"
                : status.doclingReachable
                  ? t("common.yes")
                  : t("common.no")
            }
          />
          <Stat
            label={t("upload.autoRun.doclingFails")}
            value={`${status?.consecutiveDoclingFailures ?? 0} / 3`}
          />
          <Stat
            label={t("upload.autoRun.reportFails")}
            value={`${status?.consecutiveReportFailures ?? 0} / 5`}
          />
          <Stat
            label={t("upload.autoRun.lastEnqueue")}
            value={formatTs(status?.lastEnqueuedAt ?? null)}
          />
          <Stat
            label={t("upload.autoRun.lastTick")}
            value={formatTs(status?.lastTickAt ?? null)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-03 bg-gray-04/50 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-01">
          {t("upload.autoRun.filtersTitle")}
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <MultiCheckList
            label={t("upload.autoRun.reportTypes")}
            loading={reportTypesLoading}
            emptyLabel={t("upload.autoRun.noReportTypes")}
            items={reportTypes.map((rt) => ({
              id: rt.id,
              label: rt.label?.trim() || rt.slug,
            }))}
            selected={reportTypeIds}
            onChange={(next) => {
              markFormDirty();
              setReportTypeIds(next);
            }}
          />
          <MultiCheckList
            label={t("upload.autoRun.registryBatches")}
            loading={registryBatchesLoading}
            emptyLabel={t("upload.autoRun.noRegistryBatches")}
            items={registryBatches.map((b) => ({
              id: b.id,
              label: b.batchName,
            }))}
            selected={registryBatchIds}
            onChange={(next) => {
              markFormDirty();
              setRegistryBatchIds(next);
            }}
          />
          <MultiCheckList
            label={t("upload.autoRun.coverageLists")}
            loading={coverageLoading}
            emptyLabel={t("upload.autoRun.noCoverageLists")}
            items={coverageLists.map((list) => ({
              id: list.id,
              label: list.name,
            }))}
            selected={coverageListIds}
            onChange={(next) => {
              markFormDirty();
              setCoverageListIds(next);
            }}
          />
        </div>
        <p className="text-xs text-gray-02">
          {t("upload.autoRun.filtersHint")}
        </p>
      </div>

      <UploadRunOptions
        pipelineMode="emissions"
        batch={{
          existingBatches,
          batchesLoading,
          batchDropdownChoice,
          onBatchDropdownChoiceChange: (value) => {
            markFormDirty();
            setBatchDropdownChoice(value);
          },
          customBatchName,
          onCustomBatchNameChange: (value) => {
            markFormDirty();
            setCustomBatchName(value);
          },
        }}
        tags={{
          tagOptions,
          tagsLoading,
          tagsError,
          selectedTags,
          onSelectedTagsChange: (tags) => {
            markFormDirty();
            setSelectedTags(tags);
          },
        }}
        workers={{
          runAllWorkers,
          onRunAllWorkersChange: (value) => {
            markFormDirty();
            setRunAllWorkers(value);
          },
          selectedWorkers,
          onSelectedWorkersChange: handleWorkerToggle,
          forceReindex,
          onForceReindexChange: (value) => {
            markFormDirty();
            setForceReindex(value);
          },
          autoApprove,
          onAutoApproveChange: (value) => {
            markFormDirty();
            setAutoApprove(value);
          },
          requireEmissionsPresence,
          onRequireEmissionsPresenceChange: (value) => {
            markFormDirty();
            setRequireEmissionsPresence(value);
          },
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={saving} onClick={() => void saveConfig()}>
          {saving ? t("upload.autoRun.saving") : t("upload.autoRun.save")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={() => void refresh()}
        >
          {t("common.refresh")}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-03/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-02">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-01 tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}
