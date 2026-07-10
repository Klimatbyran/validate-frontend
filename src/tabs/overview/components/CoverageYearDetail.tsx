import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ReportYearPill } from "./ReportYearPill";
import { CoverageFindReportDialog } from "./CoverageFindReportDialog";
import { searchCompanyReports } from "@/tabs/crawler/lib/crawler-utils";
import type { CompanyReport } from "@/tabs/crawler/lib/crawler-types";
import type {
  CoverageEntry,
  CoverageEntryFilter,
  CoverageYearDetail,
} from "@/tabs/overview/lib/coverage-types";

type CoverageYearDetailProps = {
  detail: CoverageYearDetail;
  onEdit: () => void;
  onEditEntry: (entry: CoverageEntry) => void;
  onViewRegistryReports?: (names: string[]) => void;
  onRegistryReportSaved?: () => void;
};

function entryMatchesFilter(
  entry: CoverageEntry,
  filter: CoverageEntryFilter,
): boolean {
  const reports = entry.registryReports ?? [];

  switch (filter) {
    case "all":
      return true;
    case "matched":
    case "missing":
    case "ambiguous":
      return entry.status === filter;
    case "registryInProd":
      return reports.some((report) => report.prodReady);
    case "registryOnly":
      return reports.length > 0 && !reports.some((report) => report.prodReady);
    case "registryMissing":
      return reports.length === 0;
    default:
      return true;
  }
}

export function CoverageYearDetailView({
  detail,
  onEdit,
  onEditEntry,
  onViewRegistryReports,
  onRegistryReportSaved,
}: CoverageYearDetailProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<CoverageEntryFilter>("all");
  const [search, setSearch] = useState("");

  const missingCount =
    detail.totalNames - detail.matchedCount - detail.ambiguousCount;

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("sv-SE");

    return detail.entries.filter((entry) => {
      if (!entryMatchesFilter(entry, filter)) return false;
      if (!q) return true;

      const haystack = [
        entry.name,
        entry.matchedCompany?.name ?? "",
        entry.matchedCompany?.wikidataId ?? "",
        ...(entry.registryReports ?? []).map(
          (report) => `${report.reportYear ?? ""} ${report.companyName ?? ""}`,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("sv-SE");

      return haystack.includes(q);
    });
  }, [detail.entries, filter, search]);

  const filterOptions: { value: CoverageEntryFilter; label: string }[] = [
    { value: "all", label: t("overview.coverage.filters.all") },
    { value: "matched", label: t("overview.coverage.filters.matched") },
    { value: "missing", label: t("overview.coverage.filters.missing") },
    { value: "ambiguous", label: t("overview.coverage.filters.ambiguous") },
    {
      value: "registryInProd",
      label: t("overview.coverage.filters.registryInProd"),
    },
    {
      value: "registryOnly",
      label: t("overview.coverage.filters.registryOnly"),
    },
    {
      value: "registryMissing",
      label: t("overview.coverage.filters.registryMissing"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-03 bg-gray-05/50 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-01">
            {detail.listName} — {detail.year}
          </h3>
          <div className="flex flex-wrap gap-2">
            {onViewRegistryReports ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onViewRegistryReports(
                    detail.entries.map((entry) => entry.name),
                  )
                }
              >
                {t("overview.coverage.reports.viewInRegistry")}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={onEdit}>
              {t("overview.coverage.editYear")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <CoverageStatCard
            label={t("overview.coverage.stats.total")}
            value={detail.totalNames}
            className="border-gray-03/80 bg-gray-04/30 text-gray-01"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.matched")}
            value={detail.matchedCount}
            className="border-green-03/30 bg-green-03/10 text-green-03"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.missing")}
            value={missingCount}
            className="border-orange-03/30 bg-orange-03/10 text-orange-03"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.ambiguous")}
            value={detail.ambiguousCount}
            className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          />
          <CoverageStatCard
            label={t("overview.coverage.stats.coverage")}
            value={`${detail.coveragePercent}%`}
            className="border-blue-03/30 bg-blue-03/10 text-blue-03"
          />
        </div>
      </div>

      <ViewModePills
        options={filterOptions}
        value={filter}
        onValueChange={setFilter}
        ariaLabel={t("overview.coverage.entryFilterLabel")}
      />

      <input
        className="w-full max-w-md rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("overview.coverage.searchPlaceholder")}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-03">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-05/80 text-left text-gray-02">
            <tr>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.listName")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.status")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.dbMatch")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("overview.coverage.columns.reports")}
              </th>
              <th className="px-4 py-2 font-medium min-w-[12rem]">
                {t("overview.coverage.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <CoverageEntryRow
                key={entry.id}
                entry={entry}
                reportYear={detail.year}
                onEditEntry={onEditEntry}
                onRegistryReportSaved={onRegistryReportSaved}
              />
            ))}
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-02">
                  {t("overview.coverage.noEntries")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoverageStatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CoverageEntryRow({
  entry,
  reportYear,
  onEditEntry,
  onRegistryReportSaved,
}: {
  entry: CoverageEntry;
  reportYear: number;
  onEditEntry: (entry: CoverageEntry) => void;
  onRegistryReportSaved?: () => void;
}) {
  const { t } = useI18n();
  const [isFindingReport, setIsFindingReport] = useState(false);
  const [findReportOpen, setFindReportOpen] = useState(false);
  const [companyReport, setCompanyReport] = useState<CompanyReport | null>(
    null,
  );

  const handleFindReport = async () => {
    setIsFindingReport(true);
    try {
      const results = await searchCompanyReports({
        companyNames: [entry.name],
        reportYear: String(reportYear),
      });
      const report = results[0] ?? {
        companyName: entry.name,
        reportYear: String(reportYear),
        results: [],
      };
      setCompanyReport({
        ...report,
        wikidataId: entry.matchedCompany?.wikidataId,
      });
      setFindReportOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.findReportError"),
      );
    } finally {
      setIsFindingReport(false);
    }
  };

  const statusLabel =
    entry.status === "matched"
      ? t("overview.coverage.filters.matched")
      : entry.status === "missing"
        ? t("overview.coverage.filters.missing")
        : t("overview.coverage.filters.ambiguous");

  const statusClass =
    entry.status === "matched"
      ? "text-green-03"
      : entry.status === "missing"
        ? "text-orange-03"
        : "text-yellow-400";

  const reports = entry.registryReports ?? [];

  return (
    <tr className="border-t border-gray-03/60">
      <td className="px-4 py-2 text-gray-01">{entry.name}</td>
      <td className={`px-4 py-2 font-medium ${statusClass}`}>
        <span>{statusLabel}</span>
        {entry.matchMethod === "manual" ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-03">
            {t("overview.coverage.manualBadge")}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-gray-02">
        {entry.matchedCompany ? (
          <Link
            to={editorCompanyPath(entry.matchedCompany.wikidataId)}
            className="text-blue-03 hover:underline"
          >
            {entry.matchedCompany.name}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2">
        {reports.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {reports.map((report) => (
              <ReportYearPill key={report.reportId} report={report} />
            ))}
          </div>
        ) : (
          <span className="font-medium text-gray-02">
            {t("overview.coverage.reports.missing")}
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditEntry(entry)}
            disabled={isFindingReport}
          >
            {t("overview.coverage.editMatch")}
          </Button>
          {isFindingReport ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="min-w-[7.5rem]"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleFindReport()}
            >
              {t("overview.coverage.findReport")}
            </Button>
          )}
        </div>
        <CoverageFindReportDialog
          open={findReportOpen}
          onOpenChange={setFindReportOpen}
          entry={entry}
          reportYear={reportYear}
          companyReport={companyReport}
          onSaved={onRegistryReportSaved}
        />
      </td>
    </tr>
  );
}
