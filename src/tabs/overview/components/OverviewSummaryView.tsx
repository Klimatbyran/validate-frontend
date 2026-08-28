import { useI18n } from "@/contexts/I18nContext";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import type { OverviewSummaryResponse } from "../lib/overview-types";
import { OverviewDailyActivitySection } from "./OverviewDailyActivitySection";
import { OverviewSummaryGapLists } from "./OverviewSummaryGapLists";
import { CountTable, SummarySection } from "./OverviewSummaryShared";

type Props = {
  summary: OverviewSummaryResponse;
};

function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function OverviewSummaryView({ summary }: Props) {
  const { t } = useI18n();
  const { totals } = summary;

  return (
    <div className="space-y-8">
      <OverviewDailyActivitySection />

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
          description={t(
            "overview.summary.sections.emissionsYearHistogramHint",
          )}
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

      <OverviewSummaryGapLists gaps={summary.gaps} />
    </div>
  );
}
