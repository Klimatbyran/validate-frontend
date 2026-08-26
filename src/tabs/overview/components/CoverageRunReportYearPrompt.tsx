import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { RegistryReportPill } from "@/tabs/overview/lib/coverage-types";
import {
  groupRegistryReportsByYear,
  registryReportMenuLabel,
} from "@/tabs/overview/lib/coverage-registry-report-run";

type CoverageRunReportYearPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  reports: RegistryReportPill[];
  onConfirm: (report: RegistryReportPill) => void;
};

export function CoverageRunReportYearPrompt({
  open,
  onOpenChange,
  companyName,
  reports,
  onConfirm,
}: CoverageRunReportYearPromptProps) {
  const { t } = useI18n();
  const groups = useMemo(() => groupRegistryReportsByYear(reports), [reports]);
  const defaultYear = groups[0]?.year ?? null;
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultYear);
  const selectedGroup =
    groups.find((group) => group.year === selectedYear) ?? groups[0] ?? null;
  const defaultReportId = selectedGroup?.reports[0]?.reportId ?? "";
  const [selectedReportId, setSelectedReportId] = useState(defaultReportId);

  const yearOptionsKey = groups.map((group) => group.year ?? "?").join(",");
  const reportIdsKey = (selectedGroup?.reports ?? [])
    .map((report) => report.reportId)
    .join(",");

  useEffect(() => {
    if (!open || defaultYear == null) return;
    setSelectedYear(defaultYear);
  }, [open, yearOptionsKey, defaultYear]);

  useEffect(() => {
    if (!open) return;
    setSelectedReportId(selectedGroup?.reports[0]?.reportId ?? "");
  }, [open, reportIdsKey, selectedGroup]);

  const selectedReport =
    selectedGroup?.reports.find(
      (report) => report.reportId === selectedReportId,
    ) ??
    selectedGroup?.reports[0] ??
    null;

  const handleConfirm = () => {
    if (!selectedReport) return;
    onConfirm(selectedReport);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,24rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("overview.coverage.runReportYearTitle")}</DialogTitle>
          <DialogDescription className="text-left">
            {t("overview.coverage.runReportYearDescription", {
              name: companyName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <label className="block text-sm font-medium text-gray-01">
            {t("crawler.reportYear")}
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const year = group.year;
              const active = selectedYear === year;
              return (
                <button
                  key={year ?? "unknown"}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? "border-orange-03 bg-orange-03/20 text-orange-03"
                      : "border-gray-03 text-gray-02 hover:border-gray-02 hover:text-gray-01"
                  }`}
                >
                  {year ?? "?"}
                </button>
              );
            })}
          </div>

          {selectedGroup && selectedGroup.reports.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-01">
                {t("crawler.reportType")}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.reports.map((report) => {
                  const active = selectedReportId === report.reportId;
                  return (
                    <button
                      key={report.reportId}
                      type="button"
                      onClick={() => setSelectedReportId(report.reportId)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        active
                          ? "border-orange-03 bg-orange-03/20 text-orange-03"
                          : "border-gray-03 text-gray-02 hover:border-gray-02 hover:text-gray-01"
                      }`}
                    >
                      {registryReportMenuLabel(
                        report,
                        selectedGroup.reports,
                        t("overview.coverage.reports.unknownType"),
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="whitespace-nowrap"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="whitespace-nowrap"
            disabled={!selectedReport}
            onClick={handleConfirm}
          >
            {t("overview.coverage.runReportContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
