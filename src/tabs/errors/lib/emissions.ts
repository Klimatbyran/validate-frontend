import { getPeriodReportYear } from "@/tabs/editor/lib/reporting-period-ui";
import { ReportingPeriod, DATA_POINTS, DatapointNoteInfo } from "../types";
import { pickReportingPeriodsForFilters } from "./reporting-period-comparison";

// Emission values can be either a plain number or an object with { total: number }
export function extractTotal(
  value: number | { total?: number | null } | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "total" in value) {
    const total = value.total;
    return typeof total === "number" ? total : null;
  }
  return null;
}

export function getPeriodReportYearFromApi(
  period: ReportingPeriod,
): number | null {
  const raw = getPeriodReportYear(period);
  if (!raw) return null;
  const year = Number(raw);
  return Number.isFinite(year) ? year : null;
}

/** Pick one reporting period (first match after shell sort). Prefer multi-slot helpers. */
export function pickReportingPeriodForFilters(
  reportingPeriods: ReportingPeriod[] | undefined,
  dataYear: number,
  reportYear?: number | null,
): ReportingPeriod | null {
  const matches = pickReportingPeriodsForFilters(
    reportingPeriods,
    dataYear,
    reportYear,
  );
  return matches[0] ?? null;
}

/** Pick the first reporting period for a data year (legacy single-period helper). */
export function pickReportingPeriodForYear(
  reportingPeriods: ReportingPeriod[] | undefined,
  year: number,
): ReportingPeriod | null {
  return pickReportingPeriodForFilters(reportingPeriods, year);
}

type Scope3Emissions = NonNullable<
  NonNullable<ReportingPeriod["emissions"]>["scope3"]
>;

/** Get value for a specific scope 3 category. */
export function getCategoryValue(
  scope3: Scope3Emissions | null | undefined,
  categoryNum: number,
): number | null {
  if (!scope3?.categories) return null;
  const cat = scope3.categories.find(
    (c: { category: number; total: number | null }) =>
      c.category === categoryNum,
  );
  return cat?.total ?? null;
}

/** Get value for a data point from emissions. */
export function getDataPointValue(
  emissions: ReportingPeriod["emissions"] | null | undefined,
  dataPointId: string,
): number | null {
  if (!emissions) return null;

  if (dataPointId === "scope1-total") return extractTotal(emissions.scope1);
  if (dataPointId === "scope2-mb") return extractTotal(emissions.scope2?.mb);
  if (dataPointId === "scope2-lb") return extractTotal(emissions.scope2?.lb);
  if (dataPointId === "scope2-unknown")
    return extractTotal(emissions.scope2?.unknown);

  if (dataPointId === "stated-total")
    return extractTotal(emissions.statedTotalEmissions);
  if (dataPointId === "calculated-total")
    return extractTotal(emissions.calculatedTotalEmissions);

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === "scope3-stated-total")
    return extractTotal(scope3.statedTotalEmissions);
  if (dataPointId === "scope3-calculated-total")
    return extractTotal(scope3.calculatedTotalEmissions);

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category) return getCategoryValue(scope3, dataPoint.category);

  return null;
}

/**
 * Get the reviewer note for a data point. Populated on both the pipeline list and
 * detail reads (unlike the datapoint `id`, which the list intentionally omits -
 * see `resolveStageDatapoint` in `datapoint-notes.ts`). Mirrors `getDataPointValue`'s
 * dispatch by data point id.
 */
export function getDataPointNote(
  emissions: ReportingPeriod["emissions"] | null | undefined,
  dataPointId: string,
): DatapointNoteInfo | null {
  if (!emissions) return null;

  if (dataPointId === "scope1-total") return emissions.scope1?.note ?? null;
  if (
    dataPointId === "scope2-mb" ||
    dataPointId === "scope2-lb" ||
    dataPointId === "scope2-unknown"
  ) {
    return emissions.scope2?.note ?? null;
  }

  if (dataPointId === "stated-total") {
    const stated = emissions.statedTotalEmissions;
    return stated && typeof stated === "object" ? (stated.note ?? null) : null;
  }

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === "scope3-stated-total") {
    return scope3.statedTotalEmissions?.note ?? null;
  }

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category) {
    return (
      scope3.categories?.find((c) => c.category === dataPoint.category)?.note ??
      null
    );
  }

  return null;
}

/** Prod API: verified when metadata.verifiedBy is non-null. */
function isVerifiedBy(
  value:
    | { metadata?: { verifiedBy?: { name: string } | null } }
    | null
    | undefined,
): boolean {
  return value != null && value.metadata?.verifiedBy != null;
}

/** Whether the given data point is marked as verified in emissions metadata (prod API uses metadata.verifiedBy). */
export function getDataPointVerified(
  emissions: ReportingPeriod["emissions"] | null | undefined,
  dataPointId: string,
): boolean {
  if (!emissions) return false;

  if (dataPointId === "scope1-total")
    return isVerifiedBy(emissions.scope1 ?? undefined);

  if (
    dataPointId === "scope2-mb" ||
    dataPointId === "scope2-lb" ||
    dataPointId === "scope2-unknown"
  ) {
    return isVerifiedBy(emissions.scope2 ?? undefined);
  }

  if (dataPointId === "stated-total") {
    const st = emissions.statedTotalEmissions;
    return typeof st === "object" && st !== null && isVerifiedBy(st);
  }
  if (dataPointId === "calculated-total") return false; // API: number | null, no metadata

  const scope3 = emissions.scope3;
  if (!scope3) return false;

  if (dataPointId === "scope3-stated-total")
    return isVerifiedBy(scope3.statedTotalEmissions ?? undefined);
  if (dataPointId === "scope3-calculated-total") return isVerifiedBy(scope3);

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category && Array.isArray(scope3.categories)) {
    const cat = scope3.categories.find(
      (c) => c.category === dataPoint.category,
    );
    return isVerifiedBy(cat ?? undefined);
  }
  return false;
}
