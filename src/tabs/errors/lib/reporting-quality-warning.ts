/**
 * Errors tab: whether a row's reporting quality is "off" enough to warrant a
 * warning icon - own/custom or grouped Scope 3 categories, fragmented values with
 * no stated total (a real risk of extraction error), or a non-explicit Scope 2
 * method. A single stated total for Scope 3, fragmentation that already comes
 * with a total, and everything else clean should NOT warn.
 */
import { DATA_POINTS, type ReportingQualityInfo } from "../types";

/** Any reporting-quality issue at all, regardless of which data point is selected. */
export function hasReportingQualityWarning(
  reportingQuality: ReportingQualityInfo | null | undefined,
): boolean {
  if (!reportingQuality) return false;

  const {
    usesGhgProtocolCategories,
    scope1FragmentedReporting,
    scope2FragmentedReporting,
    scope2MethodExplicit,
    scope3CategoryFragmentation,
  } = reportingQuality;

  if (
    usesGhgProtocolCategories === "GROUPED" ||
    usesGhgProtocolCategories === "CUSTOM_LABELS"
  ) {
    return true;
  }
  if (
    scope1FragmentedReporting === "PARTS_ONLY_NO_TOTAL" ||
    scope2FragmentedReporting === "PARTS_ONLY_NO_TOTAL"
  ) {
    return true;
  }
  if (
    scope3CategoryFragmentation.some(
      (entry) => entry.fragmentedReporting === "PARTS_ONLY_NO_TOTAL",
    )
  ) {
    return true;
  }
  if (scope2MethodExplicit === false) {
    return true;
  }

  return false;
}

function hasUnofficialCategoryLabels(
  reportingQuality: ReportingQualityInfo,
): boolean {
  return (
    reportingQuality.usesGhgProtocolCategories === "GROUPED" ||
    reportingQuality.usesGhgProtocolCategories === "CUSTOM_LABELS"
  );
}

function hasAnyUnsummedScope3Category(
  reportingQuality: ReportingQualityInfo,
): boolean {
  return reportingQuality.scope3CategoryFragmentation.some(
    (entry) => entry.fragmentedReporting === "PARTS_ONLY_NO_TOTAL",
  );
}

/**
 * Only the reporting-quality issue(s) relevant to the currently selected data
 * point - e.g. a fragmented Category 1 shouldn't put a warning icon on the
 * Scope 1 column. Whole-company/whole-scope-3 totals aggregate everything
 * underneath them, so they surface any issue in what they sum.
 */
export function getDataPointReportingQualityWarning(
  dataPointId: string,
  reportingQuality: ReportingQualityInfo | null | undefined,
): boolean {
  if (!reportingQuality) return false;

  if (dataPointId === "stated-total" || dataPointId === "calculated-total") {
    return hasReportingQualityWarning(reportingQuality);
  }
  if (
    dataPointId === "scope3-stated-total" ||
    dataPointId === "scope3-calculated-total"
  ) {
    return (
      hasUnofficialCategoryLabels(reportingQuality) ||
      hasAnyUnsummedScope3Category(reportingQuality)
    );
  }

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (!dataPoint) return false;

  if ("category" in dataPoint) {
    return (
      hasUnofficialCategoryLabels(reportingQuality) ||
      reportingQuality.scope3CategoryFragmentation.some(
        (entry) =>
          entry.category === dataPoint.category &&
          entry.fragmentedReporting === "PARTS_ONLY_NO_TOTAL",
      )
    );
  }

  switch (dataPoint.scope) {
    case "scope1":
      return (
        reportingQuality.scope1FragmentedReporting === "PARTS_ONLY_NO_TOTAL"
      );
    case "scope2":
      return (
        reportingQuality.scope2FragmentedReporting === "PARTS_ONLY_NO_TOTAL" ||
        reportingQuality.scope2MethodExplicit === false
      );
    default:
      return false;
  }
}

export type ReportingQualitySection = "scope1" | "scope2" | "scope3" | "all";

/**
 * Which section of the reporting-quality detail should be shown up front
 * (the rest goes behind "show more") for the currently selected data point.
 * "all" means there's no single relevant scope (whole-company totals, or an
 * unrecognized data point id) - show everything, no need to collapse anything.
 */
export function getPrimaryReportingQualitySection(
  dataPointId: string,
): ReportingQualitySection {
  if (dataPointId === "stated-total" || dataPointId === "calculated-total") {
    return "all";
  }
  if (
    dataPointId === "scope3-stated-total" ||
    dataPointId === "scope3-calculated-total"
  ) {
    return "scope3";
  }

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (!dataPoint) return "all";
  if ("category" in dataPoint) return "scope3";

  switch (dataPoint.scope) {
    case "scope1":
      return "scope1";
    case "scope2":
      return "scope2";
    default:
      return "all";
  }
}
