import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useRunReportsPipeline } from "@/hooks/useRunReportsPipeline";
import type { RunReportListItem } from "@/lib/run-reports-types";
import { toRunReportListItem } from "@/tabs/overview/lib/coverage-registry-report-run";
import {
  deleteReportFromRegistry,
  getRegistryRunReportsPipelineConfig,
  replaceRegistryReportSourceUrl,
} from "@/tabs/registry/lib/registry-api";
import type {
  CoverageEntry,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

type FindReportSession = {
  entry: CoverageEntry;
};

type RegistryReportActionTarget = {
  entryId: string;
  report: RegistryReportPill;
};

type RunReportSession = {
  entry: CoverageEntry;
  runItem: RunReportListItem;
};

type UseCoverageYearReportActionsArgs = {
  entries: CoverageEntry[];
  onRegistryReportRemoved?: (entryId: string, reportId: string) => void;
  onRegistryReportUpdated?: (
    entryId: string,
    reportId: string,
    updated: RegistryReportPill,
  ) => void;
};

export function useCoverageYearReportActions({
  entries,
  onRegistryReportRemoved,
  onRegistryReportUpdated,
}: UseCoverageYearReportActionsArgs) {
  const { t } = useI18n();
  const [findReportSession, setFindReportSession] =
    useState<FindReportSession | null>(null);
  const [replaceReportTarget, setReplaceReportTarget] =
    useState<RegistryReportActionTarget | null>(null);
  const [removeReportTarget, setRemoveReportTarget] =
    useState<RegistryReportActionTarget | null>(null);
  const [isReplacingReport, setIsReplacingReport] = useState(false);
  const [isRemovingReport, setIsRemovingReport] = useState(false);
  const [runReportYearEntryId, setRunReportYearEntryId] = useState<
    string | null
  >(null);
  const [runReportSession, setRunReportSession] =
    useState<RunReportSession | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  const runPipeline = useRunReportsPipeline(
    getRegistryRunReportsPipelineConfig(),
  );
  const {
    runForUrls,
    isRunningReports,
    autoApprove,
    setAutoApprove,
    runOptions,
  } = runPipeline;

  const runReportYearEntry =
    runReportYearEntryId != null
      ? (entries.find((entry) => entry.id === runReportYearEntryId) ?? null)
      : null;

  const runModalItems = useMemo((): RunReportListItem[] => {
    if (!runReportSession) return [];
    return [runReportSession.runItem];
  }, [runReportSession]);

  const openRunReportModal = (
    entry: CoverageEntry,
    report: RegistryReportPill,
  ) => {
    setRunReportSession({
      entry,
      runItem: toRunReportListItem(entry, report),
    });
    setIsRunModalOpen(true);
  };

  const handleRunReportClick = (entry: CoverageEntry) => {
    const reports = entry.registryReports ?? [];
    if (reports.length === 0) return;
    if (reports.length === 1) {
      openRunReportModal(entry, reports[0]!);
      return;
    }
    setRunReportYearEntryId(entry.id);
  };

  const handleRunReportYearConfirm = (
    entry: CoverageEntry,
    report: RegistryReportPill,
  ) => {
    setRunReportYearEntryId(null);
    openRunReportModal(entry, report);
  };

  const handleRunReportModalRun = () => {
    const url = runReportSession?.runItem.url?.trim();
    if (!url) return;
    void runForUrls([url], {
      runItems: runReportSession ? [runReportSession.runItem] : undefined,
      onSuccess: () => setIsRunModalOpen(false),
    });
  };

  const handleReplaceReportUrl = async (url: string) => {
    if (!replaceReportTarget) return;
    setIsReplacingReport(true);
    try {
      const { entry: updated, cacheFailed } =
        await replaceRegistryReportSourceUrl(
          replaceReportTarget.report.reportId,
          url,
        );
      onRegistryReportUpdated?.(
        replaceReportTarget.entryId,
        replaceReportTarget.report.reportId,
        {
          ...replaceReportTarget.report,
          url: updated.url,
          sourceUrl: updated.sourceUrl ?? updated.url,
          prodReady: false,
        },
      );
      toast.success(
        cacheFailed
          ? t("overview.coverage.replaceReportUrlSuccessCacheFailed")
          : t("overview.coverage.replaceReportUrlSuccess"),
      );
      setReplaceReportTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.replaceReportUrlError"),
      );
    } finally {
      setIsReplacingReport(false);
    }
  };

  const handleRemoveReport = async () => {
    if (!removeReportTarget) return;
    setIsRemovingReport(true);
    try {
      await deleteReportFromRegistry([removeReportTarget.report.reportId]);
      onRegistryReportRemoved?.(
        removeReportTarget.entryId,
        removeReportTarget.report.reportId,
      );
      toast.success(t("overview.coverage.removeReportSuccess"));
      setRemoveReportTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.removeReportError"),
      );
    } finally {
      setIsRemovingReport(false);
    }
  };

  return {
    runPipeline,
    findReportSession,
    setFindReportSession,
    replaceReportTarget,
    setReplaceReportTarget,
    removeReportTarget,
    setRemoveReportTarget,
    isReplacingReport,
    isRemovingReport,
    runReportYearEntry,
    setRunReportYearEntryId,
    isRunModalOpen,
    setIsRunModalOpen,
    setRunReportSession,
    runModalItems,
    autoApprove,
    setAutoApprove,
    runOptions,
    isRunningReports,
    openRunReportModal,
    handleRunReportClick,
    handleRunReportYearConfirm,
    handleRunReportModalRun,
    handleReplaceReportUrl,
    handleRemoveReport,
  };
}
