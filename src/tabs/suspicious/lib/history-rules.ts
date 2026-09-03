import type {
  DataPointObservation,
  SuspicionFinding,
  SuspicionSeverity,
} from "../types";
import { median, powerOfTenFactor, ratioFactor } from "./stats";
import { SUSPICION_CONFIG } from "./suspicion-config";

/**
 * Series of one company's values for one data point across its data years,
 * so each year can be judged against the rest of that company's own history.
 */
function groupByCompanyAndDataPoint(
  observations: DataPointObservation[],
): Map<string, DataPointObservation[]> {
  const series = new Map<string, DataPointObservation[]>();
  for (const observation of observations) {
    const key = `${observation.companyId}:${observation.dataPointId}`;
    const existing = series.get(key);
    if (existing) existing.push(observation);
    else series.set(key, [observation]);
  }
  return series;
}

function findingBase(
  observation: DataPointObservation,
): Omit<
  SuspicionFinding,
  | "id"
  | "rule"
  | "severity"
  | "score"
  | "messageKey"
  | "messageParams"
  | "comparisons"
> {
  return {
    companyId: observation.companyId,
    companyName: observation.companyName,
    wikidataId: observation.wikidataId,
    tags: observation.tags,
    dataYear: observation.dataYear,
    reportYear: observation.reportYear,
    reportUrl: observation.reportUrl,
    dataPointId: observation.dataPointId,
    dataPointLabel: observation.dataPointLabel,
    value: observation.value,
    origin: observation.origin,
    verifiedByName: observation.verifiedByName,
  };
}

/**
 * Compare each year against the median of the same company's *other* years.
 *
 * A factor near a power of ten is reported as a unit mix-up (kg reported where
 * the rest of the series is in tonnes) rather than as a generic jump, since
 * that is both a stronger signal and a different fix.
 */
export function detectHistoryAnomalies(
  observations: DataPointObservation[],
): SuspicionFinding[] {
  const findings: SuspicionFinding[] = [];

  for (const series of groupByCompanyAndDataPoint(observations).values()) {
    if (series.length < SUSPICION_CONFIG.history.minOtherYears + 1) continue;

    for (const observation of series) {
      if (observation.value <= 0) continue;

      const otherValues = series
        .filter((other) => other.dataYear !== observation.dataYear)
        .map((other) => other.value)
        .filter((value) => value > 0);

      if (otherValues.length < SUSPICION_CONFIG.history.minOtherYears) continue;

      const baseline = median(otherValues);
      if (baseline === null || baseline <= 0) continue;

      const factor = ratioFactor(observation.value, baseline);
      if (factor === null || factor < SUSPICION_CONFIG.history.flagFactor) {
        continue;
      }

      const above = observation.value > baseline;
      const unitFactor = powerOfTenFactor(
        factor,
        SUSPICION_CONFIG.unitScale.tolerance,
      );
      const isUnitScale =
        unitFactor !== null &&
        unitFactor >= SUSPICION_CONFIG.unitScale.minFactor;

      const severity: SuspicionSeverity = isUnitScale
        ? "high"
        : factor >= SUSPICION_CONFIG.history.highFactor
          ? "high"
          : "medium";

      const comparisons = [
        {
          labelKey: "suspicious.comparison.ownYearsMedian",
          value: baseline,
        },
        {
          labelKey: "suspicious.comparison.otherYears",
          value: otherValues.length,
        },
        {
          labelKey: "suspicious.comparison.factor",
          value: Math.round(factor),
        },
      ];

      if (isUnitScale) {
        findings.push({
          ...findingBase(observation),
          id: `unit-scale-error:${observation.key}`,
          rule: "unit-scale-error",
          severity,
          score: Math.log10(factor) * 10,
          messageKey: above
            ? "suspicious.rules.unitScaleError.messageAbove"
            : "suspicious.rules.unitScaleError.messageBelow",
          messageParams: { factor: unitFactor },
          comparisons,
        });
        continue;
      }

      findings.push({
        ...findingBase(observation),
        id: `year-over-year-jump:${observation.key}`,
        rule: "year-over-year-jump",
        severity,
        score: Math.log10(factor) * 10,
        messageKey: above
          ? "suspicious.rules.yearOverYearJump.messageAbove"
          : "suspicious.rules.yearOverYearJump.messageBelow",
        messageParams: {
          factor: Math.round(factor),
          otherYears: otherValues.length,
        },
        comparisons,
      });
    }
  }

  return findings;
}
