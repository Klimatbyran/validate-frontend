import { useI18n } from "@/contexts/I18nContext";
import type {
  CoverageReportRunStatus,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";

type ReportYearPillProps = {
  report: RegistryReportPill;
};

function runStatusDotClass(runStatus: CoverageReportRunStatus): string {
  if (runStatus === "completed") return "bg-green-03";
  if (runStatus === "failed") return "bg-pink-03";
  return "bg-yellow-500";
}

function runStatusTitleKey(
  runStatus: CoverageReportRunStatus,
):
  | "overview.coverage.reports.pillRunCompleted"
  | "overview.coverage.reports.pillRunFailed"
  | "overview.coverage.reports.pillRunNotRun" {
  if (runStatus === "completed") {
    return "overview.coverage.reports.pillRunCompleted";
  }
  if (runStatus === "failed") {
    return "overview.coverage.reports.pillRunFailed";
  }
  return "overview.coverage.reports.pillRunNotRun";
}

export function ReportYearPill({ report }: ReportYearPillProps) {
  const { t } = useI18n();
  const href = report.sourceUrl?.trim() || report.url;
  const label = report.reportYear ?? "?";
  const runStatus = report.runStatus ?? "not_run";
  const className = report.prodReady
    ? "border-green-03/40 bg-green-03/20 text-green-03 hover:bg-green-03/30"
    : "border-yellow-500/40 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`${
        report.prodReady
          ? t("overview.coverage.reports.pillInProd")
          : t("overview.coverage.reports.pillInRegistry")
      } · ${t(runStatusTitleKey(runStatus))}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${runStatusDotClass(runStatus)}`}
        aria-hidden
      />
      {label}
    </a>
  );
}
