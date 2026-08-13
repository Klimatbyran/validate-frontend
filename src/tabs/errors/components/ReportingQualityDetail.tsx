/**
 * Errors tab: quick-peek content for the reporting-quality warning icon in
 * CompanyTableRow. Mirrors the friendly panel in
 * jobbstatus/components/job-details/JobSpecificDataView.tsx and reuses the same
 * i18n keys (jobstatus.jobdetails.reportingQuality.*) so the two views stay
 * in sync without duplicating translation strings.
 *
 * Leads with whichever scope matches the currently selected data point (e.g.
 * filtering to a Scope 3 category surfaces the category breakdown first);
 * everything else is tucked behind "show more" so the peek stays focused.
 */
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { getPrimaryReportingQualitySection } from "../lib";
import type { ReportingQualityInfo } from "../types";

function renderBoolean(t: (key: string) => string, value: boolean | null) {
  if (value === null)
    return (
      <span className="text-gray-02">{t("jobstatus.jobdetails.noValue")}</span>
    );
  return value ? t("common.yes") : t("common.no");
}

const CATEGORY_REPORTING_KEY: Record<string, string> = {
  FULL: "full",
  GROUPED: "grouped",
  CUSTOM_LABELS: "customLabels",
  SINGLE_TOTAL: "singleTotal",
};

const FRAGMENTED_REPORTING_KEY: Record<string, string> = {
  NONE: "none",
  PARTS_WITH_TOTAL: "partsWithTotal",
  PARTS_ONLY_NO_TOTAL: "partsOnlyNoTotal",
};

export function ReportingQualityDetail({
  reportingQuality,
  selectedDataPoint,
}: {
  reportingQuality: ReportingQualityInfo;
  selectedDataPoint: string;
}) {
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);

  const renderCategoryReporting = (value: string | null) => {
    if (value === null)
      return (
        <span className="text-gray-02">
          {t("jobstatus.jobdetails.noValue")}
        </span>
      );
    const key = CATEGORY_REPORTING_KEY[value];
    return key
      ? t(`jobstatus.jobdetails.reportingQuality.categoryReporting.${key}`)
      : value;
  };

  const renderFragmentedReporting = (value: string | null) => {
    if (value === null)
      return (
        <span className="text-gray-02">
          {t("jobstatus.jobdetails.noValue")}
        </span>
      );
    const key = FRAGMENTED_REPORTING_KEY[value];
    return key
      ? t(`jobstatus.jobdetails.reportingQuality.fragmentedReporting.${key}`)
      : value;
  };

  const scope1Section = (
    <div className="text-sm text-gray-02">
      <span className="font-medium text-gray-01">
        {t("jobstatus.jobdetails.reportingQuality.fragmentedReporting.scope1")}:
      </span>{" "}
      {renderFragmentedReporting(reportingQuality.scope1FragmentedReporting)}
      {reportingQuality.scope1FragmentedExample && (
        <span className="block italic mt-0.5">
          “{reportingQuality.scope1FragmentedExample}”
        </span>
      )}
    </div>
  );

  const scope2Section = (
    <>
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01">
          {t("jobstatus.jobdetails.reportingQuality.scope2MethodExplicit")}:
        </span>{" "}
        {renderBoolean(t, reportingQuality.scope2MethodExplicit)}
      </div>
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01">
          {t(
            "jobstatus.jobdetails.reportingQuality.fragmentedReporting.scope2",
          )}
          :
        </span>{" "}
        {renderFragmentedReporting(reportingQuality.scope2FragmentedReporting)}
        {reportingQuality.scope2FragmentedExample && (
          <span className="block italic mt-0.5">
            “{reportingQuality.scope2FragmentedExample}”
          </span>
        )}
      </div>
    </>
  );

  const scope3Section = (
    <>
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01">
          {t("jobstatus.jobdetails.reportingQuality.usesGhgProtocolCategories")}
          :
        </span>{" "}
        {renderCategoryReporting(reportingQuality.usesGhgProtocolCategories)}
      </div>
      {reportingQuality.categoryLabelsExample && (
        <div className="text-sm text-gray-02">
          <span className="font-medium text-gray-01">
            {t("jobstatus.jobdetails.reportingQuality.categoryLabelsExample")}:
          </span>{" "}
          <span className="italic">
            “{reportingQuality.categoryLabelsExample}”
          </span>
        </div>
      )}
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01 block mb-1">
          {t(
            "jobstatus.jobdetails.reportingQuality.fragmentedReporting.scope3",
          )}
          :
        </span>
        {reportingQuality.scope3CategoryFragmentation.length === 0 ? (
          <span className="text-gray-02">
            {t(
              "jobstatus.jobdetails.reportingQuality.fragmentedReporting.noCategoriesFragmented",
            )}
          </span>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {reportingQuality.scope3CategoryFragmentation.map((entry) => (
              <li key={entry.category}>
                {t(
                  "jobstatus.jobdetails.reportingQuality.fragmentedReporting.category",
                  { number: entry.category },
                )}
                :{" "}
                {t(
                  `jobstatus.jobdetails.reportingQuality.fragmentedReporting.${
                    entry.fragmentedReporting === "PARTS_WITH_TOTAL"
                      ? "partsWithTotal"
                      : "partsOnlyNoTotal"
                  }`,
                )}
                <span className="block italic mt-0.5">“{entry.example}”</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const otherSection = (
    <>
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01">
          {t("jobstatus.jobdetails.reportingQuality.missingScopesExplained")}:
        </span>{" "}
        {renderBoolean(t, reportingQuality.missingScopesExplained)}
      </div>
      {reportingQuality.missingScopesReason && (
        <div className="text-sm text-gray-02">
          <span className="font-medium text-gray-01">
            {t("jobstatus.jobdetails.reportingQuality.missingScopesReason")}:
          </span>{" "}
          {reportingQuality.missingScopesReason}
        </div>
      )}
      <div className="text-sm text-gray-02">
        <span className="font-medium text-gray-01 block mb-1">
          {t("jobstatus.jobdetails.reportingQuality.methodChanges")}:
        </span>
        {reportingQuality.methodChanges.length === 0 ? (
          <span className="text-gray-02">
            {t("jobstatus.jobdetails.reportingQuality.noMethodChanges")}
          </span>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {reportingQuality.methodChanges.map((change, i) => (
              <li key={i}>
                {change.year != null ? `${change.year}: ` : ""}
                {change.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const primary = getPrimaryReportingQualitySection(selectedDataPoint);

  if (primary === "all") {
    return (
      <div className="space-y-2">
        {scope3Section}
        {scope1Section}
        {scope2Section}
        {otherSection}
      </div>
    );
  }

  const primarySection =
    primary === "scope1"
      ? scope1Section
      : primary === "scope2"
        ? scope2Section
        : scope3Section;
  const secondarySections = [
    primary !== "scope1" && <div key="scope1">{scope1Section}</div>,
    primary !== "scope2" && <div key="scope2">{scope2Section}</div>,
    primary !== "scope3" && <div key="scope3">{scope3Section}</div>,
    <div key="other">{otherSection}</div>,
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {primarySection}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-xs text-gray-02 underline decoration-dotted hover:text-gray-01"
      >
        {showMore
          ? t("errors.reportingQualityShowLess")
          : t("errors.reportingQualityShowMore")}
      </button>
      {showMore && (
        <div className="space-y-2 pt-2 mt-1 border-t border-gray-03/30">
          {secondarySections}
        </div>
      )}
    </div>
  );
}
