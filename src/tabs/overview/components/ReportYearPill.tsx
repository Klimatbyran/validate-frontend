import { useI18n } from "@/contexts/I18nContext";
import type { RegistryReportPill } from "@/tabs/overview/lib/coverage-types";

type ReportYearPillProps = {
  report: RegistryReportPill;
};

export function ReportYearPill({ report }: ReportYearPillProps) {
  const { t } = useI18n();
  const href = report.sourceUrl?.trim() || report.url;
  const label = report.reportYear ?? "?";
  const className = report.prodReady
    ? "border-green-03/40 bg-green-03/20 text-green-03 hover:bg-green-03/30"
    : "border-orange-03/40 bg-orange-03/20 text-orange-03 hover:bg-orange-03/30";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={
        report.prodReady
          ? t("overview.coverage.reports.pillProdReady")
          : t("overview.coverage.reports.pillNotProdReady")
      }
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
    >
      {label}
    </a>
  );
}
