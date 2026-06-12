import { DATA_POINTS } from "@/tabs/errors/types";
import type { ReportingPeriod } from "@/tabs/errors/types";
import {
  getDataPointValue,
  getDataPointVerified,
} from "@/tabs/errors/lib/emissions";

export function listVerifiedDataPointsOnPeriod(
  period: ReportingPeriod,
): string[] {
  const emissions = period.emissions;
  if (!emissions) return [];

  const labels: string[] = [];
  for (const dp of DATA_POINTS) {
    if (dp.id === "calculated-total") continue;
    const value = getDataPointValue(emissions, dp.id);
    if (value === null) continue;
    if (getDataPointVerified(emissions, dp.id)) {
      labels.push(dp.label);
    }
  }
  return labels;
}

export function periodHasAnyVerifiedEmissions(
  period: ReportingPeriod,
): boolean {
  return listVerifiedDataPointsOnPeriod(period).length > 0;
}

export function periodsHaveAnyVerifiedEmissions(
  periods: ReportingPeriod[],
): boolean {
  return periods.some((period) => periodHasAnyVerifiedEmissions(period));
}

export function periodHasAnyEmissionsData(period: ReportingPeriod): boolean {
  const emissions = period.emissions;
  if (!emissions) return false;

  for (const dp of DATA_POINTS) {
    if (dp.id === "calculated-total") continue;
    if (getDataPointValue(emissions, dp.id) !== null) return true;
  }
  return false;
}

export function periodsHaveAnyEmissionsData(
  periods: ReportingPeriod[],
): boolean {
  return periods.some((period) => periodHasAnyEmissionsData(period));
}

export function collectVerifiedDataPointLabels(
  periods: ReportingPeriod[],
): string[] {
  const labels = new Set<string>();
  for (const period of periods) {
    for (const label of listVerifiedDataPointsOnPeriod(period)) {
      labels.add(label);
    }
  }
  return Array.from(labels);
}
