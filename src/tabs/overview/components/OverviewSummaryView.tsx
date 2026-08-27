import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import type {
  OverviewSummaryCompanyRef,
  OverviewSummaryResponse,
} from "../lib/overview-types";

/** Same idea as coverage tables: scroll inside a fixed frame instead of growing the page. */
const SUMMARY_TABLE_MAX_HEIGHT_PX = 320;
const SUMMARY_GAP_TABLE_MAX_HEIGHT_PX = 360;

type Props = {
  summary: OverviewSummaryResponse;
};

function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function SummarySection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-blue-03 uppercase tracking-wide">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-gray-02 mt-1 max-w-3xl">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CountTable({
  headers,
  rows,
  maxHeightPx = SUMMARY_TABLE_MAX_HEIGHT_PX,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  maxHeightPx?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-02">—</p>;
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-gray-03"
      style={{ maxHeight: maxHeightPx }}
    >
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-05 text-left text-xs uppercase tracking-wide text-gray-02 shadow-[inset_0_-1px_0_0] shadow-gray-03">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row[0]}-${index}`}
              className="border-t border-gray-03/80 text-gray-01"
            >
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GapCompanyList({
  title,
  description,
  totalMatching,
  companies,
  emptyLabel,
}: {
  title: string;
  description: string;
  totalMatching: number;
  companies: OverviewSummaryCompanyRef[];
  emptyLabel: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/40 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-blue-03">{title}</h4>
          <p className="text-xs text-gray-02 mt-1">{description}</p>
        </div>
        <p className="text-xs text-gray-02">
          {t("overview.summary.showingOf", {
            shown: companies.length,
            total: totalMatching,
          })}
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-gray-02">{emptyLabel}</p>
      ) : (
        <div
          className="overflow-auto rounded-lg border border-gray-03"
          style={{ maxHeight: SUMMARY_GAP_TABLE_MAX_HEIGHT_PX }}
        >
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-05 text-left text-xs uppercase tracking-wide text-gray-02 shadow-[inset_0_-1px_0_0] shadow-gray-03">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.company")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.emissionsYears")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.reports")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.tags")}
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.companyId}
                  className="border-t border-gray-03/80"
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left text-gray-01 hover:text-blue-03"
                      onClick={() =>
                        navigate(editorCompanyPath(company.companyId))
                      }
                    >
                      {company.name}
                    </button>
                    {company.wikidataId ? (
                      <p className="text-[11px] text-gray-02 font-mono mt-0.5">
                        {company.wikidataId}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-gray-01">
                    {company.emissionsYearCount === 0
                      ? t("overview.summary.none")
                      : company.emissionsYears.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-gray-01">
                    {company.companyReportCount}
                  </td>
                  <td className="px-3 py-2 text-gray-02">
                    {company.tags.length > 0
                      ? company.tags.join(", ")
                      : t("overview.summary.none")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function OverviewSummaryView({ summary }: Props) {
  const { t } = useI18n();
  const { totals } = summary;

  return (
    <div className="space-y-8">
      <SummarySection
        title={t("overview.summary.sections.totals")}
        description={t("overview.summary.sections.totalsHint")}
      >
        <MetricCardGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <MetricCard
            label={t("overview.summary.metrics.companies")}
            value={totals.companies}
          />
          <MetricCard
            label={t("overview.summary.metrics.withEmissions")}
            value={`${totals.withAnyEmissionsData} (${formatPercent(totals.withAnyEmissionsData, totals.companies)})`}
          />
          <MetricCard
            label={t("overview.summary.metrics.withoutEmissions")}
            value={totals.withoutEmissionsData}
          />
          <MetricCard
            label={t("overview.summary.metrics.withReports")}
            value={totals.withAnyCompanyReport}
          />
          <MetricCard
            label={t("overview.summary.metrics.companyReports")}
            value={totals.companyReports}
          />
          <MetricCard
            label={t("overview.summary.metrics.registryReports")}
            value={totals.registryReports}
          />
          <MetricCard
            label={t("overview.summary.metrics.withWikidata")}
            value={`${totals.withWikidata} (${formatPercent(totals.withWikidata, totals.companies)})`}
          />
          <MetricCard
            label={t("overview.summary.metrics.withoutWikidata")}
            value={totals.withoutWikidata}
          />
          <MetricCard
            label={t("overview.summary.metrics.withTags")}
            value={totals.withTags}
          />
          <MetricCard
            label={t("overview.summary.metrics.withoutTags")}
            value={totals.withoutTags}
          />
          <MetricCard
            label={t("overview.summary.metrics.withIndustry")}
            value={totals.withIndustry}
          />
          <MetricCard
            label={t("overview.summary.metrics.withWebsite")}
            value={totals.withWebsiteUrl}
          />
          <MetricCard
            label={t("overview.summary.metrics.reportsLinked")}
            value={totals.companyReportsLinkedToRegistry}
          />
          <MetricCard
            label={t("overview.summary.metrics.reportsUnlinked")}
            value={totals.companyReportsUnlinkedToRegistry}
          />
          <MetricCard
            label={t("overview.summary.metrics.registryLinked")}
            value={totals.registryReportsLinkedToCompanyReport}
          />
        </MetricCardGrid>
      </SummarySection>

      <SummarySection
        title={t("overview.summary.sections.emissionsByYear")}
        description={t("overview.summary.sections.emissionsByYearHint")}
      >
        <CountTable
          headers={[
            t("overview.summary.columns.year"),
            t("overview.summary.columns.withPeriod"),
            t("overview.summary.columns.withEmissions"),
            t("overview.summary.columns.scope1"),
            t("overview.summary.columns.scope2"),
            t("overview.summary.columns.scope3"),
            t("overview.summary.columns.statedTotal"),
            t("overview.summary.columns.coverageOfCompanies"),
          ]}
          rows={summary.emissionsCoverageByYear.map((row) => [
            row.year,
            row.companiesWithPeriod,
            row.companiesWithEmissions,
            row.companiesWithScope1,
            row.companiesWithScope2,
            row.companiesWithScope3,
            row.companiesWithStatedTotal,
            formatPercent(row.companiesWithEmissions, totals.companies),
          ])}
        />
      </SummarySection>

      <div className="grid gap-8 lg:grid-cols-2">
        <SummarySection
          title={t("overview.summary.sections.emissionsYearHistogram")}
          description={t("overview.summary.sections.emissionsYearHistogramHint")}
        >
          <CountTable
            headers={[
              t("overview.summary.columns.yearCount"),
              t("overview.summary.columns.companies"),
            ]}
            rows={summary.companiesByEmissionsYearCount.map((row) => [
              row.yearCount,
              row.companyCount,
            ])}
          />
        </SummarySection>

        <SummarySection
          title={t("overview.summary.sections.reportCountHistogram")}
          description={t("overview.summary.sections.reportCountHistogramHint")}
        >
          <CountTable
            headers={[
              t("overview.summary.columns.reportCount"),
              t("overview.summary.columns.companies"),
            ]}
            rows={summary.companiesByCompanyReportCount.map((row) => [
              row.reportCount,
              row.companyCount,
            ])}
          />
        </SummarySection>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SummarySection
          title={t("overview.summary.sections.companyReportsByYear")}
        >
          <CountTable
            headers={[
              t("overview.summary.columns.year"),
              t("overview.summary.columns.count"),
            ]}
            rows={summary.companyReportsByYear.map((row) => [
              row.year,
              row.count,
            ])}
          />
        </SummarySection>

        <SummarySection
          title={t("overview.summary.sections.registryReportsByYear")}
          description={t("overview.summary.sections.registryReportsByYearHint")}
        >
          <CountTable
            headers={[
              t("overview.summary.columns.year"),
              t("overview.summary.columns.count"),
              t("overview.summary.columns.withWikidata"),
              t("overview.summary.columns.linked"),
            ]}
            rows={summary.registryReportsByYear.map((row) => [
              row.year,
              row.count,
              row.withWikidata,
              row.linkedToCompanyReport,
            ])}
          />
        </SummarySection>
      </div>

      <SummarySection
        title={t("overview.summary.sections.byTag")}
        description={t("overview.summary.sections.byTagHint")}
      >
        <CountTable
          headers={[
            t("overview.summary.columns.tag"),
            t("overview.summary.columns.label"),
            t("overview.summary.columns.companies"),
          ]}
          rows={summary.companiesByTag.map((row) => [
            row.slug,
            row.label ?? "—",
            row.companyCount,
          ])}
        />
      </SummarySection>

      <SummarySection
        title={t("overview.summary.sections.yearDropoffs")}
        description={t("overview.summary.sections.yearDropoffsHint")}
      >
        <CountTable
          headers={[
            t("overview.summary.columns.fromYear"),
            t("overview.summary.columns.toYear"),
            t("overview.summary.columns.companiesLost"),
          ]}
          rows={summary.yearDropoffs.map((row) => [
            row.fromYear,
            row.toYear,
            row.companiesLost,
          ])}
        />
      </SummarySection>

      <SummarySection
        title={t("overview.summary.sections.gaps")}
        description={t("overview.summary.sections.gapsHint")}
      >
        <div className="space-y-4">
          <GapCompanyList
            title={t("overview.summary.gaps.fewEmissionsYears", {
              max: summary.gaps.fewEmissionsYears.maxYears,
            })}
            description={t("overview.summary.gaps.fewEmissionsYearsHint")}
            totalMatching={summary.gaps.fewEmissionsYears.totalMatching}
            companies={summary.gaps.fewEmissionsYears.companies}
            emptyLabel={t("overview.summary.gaps.empty")}
          />
          <GapCompanyList
            title={t("overview.summary.gaps.reportsWithoutEmissions")}
            description={t(
              "overview.summary.gaps.reportsWithoutEmissionsHint",
            )}
            totalMatching={summary.gaps.reportsWithoutEmissions.totalMatching}
            companies={summary.gaps.reportsWithoutEmissions.companies}
            emptyLabel={t("overview.summary.gaps.empty")}
          />
          <GapCompanyList
            title={t("overview.summary.gaps.missingLatestYear", {
              year: summary.gaps.missingLatestYear.year,
            })}
            description={t("overview.summary.gaps.missingLatestYearHint")}
            totalMatching={summary.gaps.missingLatestYear.totalMatching}
            companies={summary.gaps.missingLatestYear.companies}
            emptyLabel={t("overview.summary.gaps.empty")}
          />
          <GapCompanyList
            title={t("overview.summary.gaps.untagged")}
            description={t("overview.summary.gaps.untaggedHint")}
            totalMatching={summary.gaps.untagged.totalMatching}
            companies={summary.gaps.untagged.companies}
            emptyLabel={t("overview.summary.gaps.empty")}
          />
        </div>
      </SummarySection>
    </div>
  );
}
