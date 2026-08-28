import { useI18n } from "@/contexts/I18nContext";
import { Callout } from "@/ui/callout";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { MetricCard, MetricCardGrid } from "@/ui/metric-card";
import { useOverviewDailyActivity } from "../hooks/useOverviewDailyActivity";
import type { OverviewDailyActivityResponse } from "../lib/overview-types";
import { CountTable, SummarySection } from "./OverviewSummaryShared";

function DailyActivityMetrics({
  activity,
  isRefreshing,
}: {
  activity: OverviewDailyActivityResponse;
  isRefreshing: boolean;
}) {
  const { t } = useI18n();
  const { pipeline, data } = activity;

  return (
    <div className={`space-y-4 ${isRefreshing ? "opacity-70" : ""}`}>
      <MetricCardGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <MetricCard
          label={t("overview.summary.activity.runsStarted")}
          value={pipeline.runsStarted}
        />
        <MetricCard
          label={t("overview.summary.activity.runsCompleted")}
          value={pipeline.runsCompleted}
        />
        <MetricCard
          label={t("overview.summary.activity.runsFailed")}
          value={pipeline.runsFailed}
        />
        <MetricCard
          label={t("overview.summary.activity.runsRunning")}
          value={pipeline.runsStillRunning}
        />
        <MetricCard
          label={t("overview.summary.activity.companiesWithRuns")}
          value={pipeline.companiesWithRuns}
        />
        <MetricCard
          label={t("overview.summary.activity.jobsFinished")}
          value={pipeline.jobsFinished}
        />
        <MetricCard
          label={t("overview.summary.activity.jobsCompleted")}
          value={pipeline.jobsCompleted}
        />
        <MetricCard
          label={t("overview.summary.activity.jobsFailed")}
          value={pipeline.jobsFailed}
        />
        <MetricCard
          label={t("overview.summary.activity.companyReportsCreated")}
          value={data.companyReportsCreated}
        />
        <MetricCard
          label={t("overview.summary.activity.companiesFirstReport")}
          value={data.companiesFirstReportCreated}
        />
        <MetricCard
          label={t("overview.summary.activity.batchesCreated")}
          value={data.batchesCreated}
        />
        <MetricCard
          label={t("overview.summary.activity.verifiedUpdates")}
          value={data.verifiedMetadataUpdates}
        />
      </MetricCardGrid>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-02">
          {t("overview.summary.activity.jobsByQueue")}
        </h4>
        <CountTable
          headers={[
            t("overview.summary.activity.columns.queue"),
            t("overview.summary.activity.columns.finished"),
            t("overview.summary.activity.columns.completed"),
            t("overview.summary.activity.columns.failed"),
          ]}
          rows={pipeline.jobsByQueue.map((row) => [
            row.queueName,
            row.finished,
            row.completed,
            row.failed,
          ])}
          maxHeightPx={240}
        />
      </div>
    </div>
  );
}

export function OverviewDailyActivitySection() {
  const { t } = useI18n();
  const { day, setDay, activity, isLoading, error } =
    useOverviewDailyActivity();

  return (
    <SummarySection
      title={t("overview.summary.sections.dailyActivity")}
      description={t("overview.summary.sections.dailyActivityHint")}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm text-gray-01">
          <span className="block text-xs uppercase tracking-wide text-gray-02">
            {t("overview.summary.activity.dayLabel")}
          </span>
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="rounded-lg border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 focus:outline-none focus:ring-2 focus:ring-blue-03"
          />
        </label>
        <p className="text-xs text-gray-02 pb-2">
          {t("overview.summary.activity.timeZoneNote")}
        </p>
      </div>

      {error ? (
        <Callout variant="error" title={t("overview.apiErrorTitle")}>
          <p className="text-sm">{error}</p>
        </Callout>
      ) : null}

      {isLoading && !activity ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : activity ? (
        <DailyActivityMetrics activity={activity} isRefreshing={isLoading} />
      ) : null}
    </SummarySection>
  );
}
