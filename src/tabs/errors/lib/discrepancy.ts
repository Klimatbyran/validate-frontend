import {
  DiscrepancyType,
  GENERIC_DATA_POINTS,
  type Company,
  type CompanyRow,
  type ReportingPeriod,
} from "../types";
import { getDataPointValue } from "./emissions";
import { findReportingPeriodForShell } from "./reporting-period-comparison";

/** Stable key for pairing the same company across stage and prod (wikidataId when present). */
export function companyCrossEnvKey(company: Company): string {
  const wikidataId = company.wikidataId?.trim();
  if (wikidataId) return wikidataId;
  return `local:${company.id}`;
}

export function crossEnvKeyFromRow(
  row: Pick<CompanyRow, "wikidataId" | "id">,
): string {
  const wikidataId = row.wikidataId?.trim();
  if (wikidataId) return wikidataId;
  return `local:${row.id}`;
}

/** Build a map of companies by cross-environment key for stage/prod comparison. */
export function companiesToMapById(companies: Company[]): Map<string, Company> {
  const map = new Map<string, Company>();
  companies.forEach((c) => map.set(companyCrossEnvKey(c), c));
  return map;
}

/** @deprecated Use companyCrossEnvKey — internal id does not match across environments. */
export function companyUnionKey(company: Company): string {
  return companyCrossEnvKey(company);
}

const UNIT_ERROR_POWERS = [10, 100, 1000, 10000, 100000, 1000000] as const;

/** Return unit-error factor (stage/prod ratio) when values differ by a power of 10; otherwise undefined. */
export function getUnitErrorFactor(
  stageValue: number | null,
  prodValue: number | null,
): number | undefined {
  if (stageValue === null || prodValue === null) return undefined;
  const absS = Math.abs(stageValue);
  const absP = Math.abs(prodValue);
  if (absS === 0 || absP === 0) return undefined;
  const ratio = Math.max(absS, absP) / Math.min(absS, absP);
  for (const power of UNIT_ERROR_POWERS) {
    if (Math.abs(ratio - power) / power <= 0.05) {
      return absS > absP ? power : 1 / power;
    }
  }
  return undefined;
}

/** Same-scope data point descriptor for category-error detection. */
export interface SameScopeDataPoint {
  id: string;
  label: string;
}

/** Classify discrepancy between stage and prod values. */
export function classifyDiscrepancy(
  stageValue: number | null,
  prodValue: number | null,
  roundingThreshold: number,
): DiscrepancyType {
  const stageHasValue = stageValue !== null && stageValue !== undefined;
  const prodHasValue = prodValue !== null && prodValue !== undefined;

  if (!stageHasValue && !prodHasValue) return "both-null";
  if (stageHasValue && !prodHasValue) return "hallucination";
  if (!stageHasValue && prodHasValue) return "missing";

  const diff = Math.abs(stageValue! - prodValue!);
  if (diff === 0) return "identical";
  if (diff <= roundingThreshold) return "rounding";

  if (getUnitErrorFactor(stageValue, prodValue) !== undefined)
    return "unit-error";

  const reference = Math.abs(prodValue!);
  if (reference > 0 && diff / reference <= 0.05) return "small-error";

  return "error";
}

/**
 * Classify a stage/prod slot, separating report coverage gaps from extraction diffs.
 * - report-absent: prod has the report shell, stage does not (run report on stage).
 * - report-extra: stage has the report shell, prod does not.
 * - missing / hallucination: both shells exist; value present on one side only.
 */
export function classifySlotDiscrepancy(
  stageValue: number | null,
  prodValue: number | null,
  hasStagePeriod: boolean,
  hasProdPeriod: boolean,
  roundingThreshold: number,
): DiscrepancyType {
  if (!hasStagePeriod && hasProdPeriod) return "report-absent";
  if (hasStagePeriod && !hasProdPeriod) return "report-extra";
  return classifyDiscrepancy(stageValue, prodValue, roundingThreshold);
}

/** Discrepancies that compare extracted values on both sides (accuracy metrics). */
export function isExtractionComparisonDiscrepancy(
  discrepancy: DiscrepancyType,
): boolean {
  return discrepancy !== "report-absent" && discrepancy !== "report-extra";
}

/** Pipeline extraction issues counted in hardest-reports ranking. */
export function isPipelineExtractionDiscrepancy(
  discrepancy: DiscrepancyType,
): boolean {
  return (
    isExtractionComparisonDiscrepancy(discrepancy) &&
    discrepancy !== "identical" &&
    discrepancy !== "rounding" &&
    discrepancy !== "both-null"
  );
}

/**
 * Reclassify discrepancy to 'category-error' when stage/prod value appears in another same-scope data point.
 * Used by overview and worst-companies metrics (no row mutation).
 */
export function reclassifyDiscrepancyForCategoryError(
  discrepancy: DiscrepancyType,
  stageValue: number | null,
  prodValue: number | null,
  stageEmissions: ReportingPeriod["emissions"] | null | undefined,
  prodEmissions: ReportingPeriod["emissions"] | null | undefined,
  sameScopeDataPoints: SameScopeDataPoint[],
): DiscrepancyType {
  if (
    discrepancy === "identical" ||
    discrepancy === "rounding" ||
    discrepancy === "both-null" ||
    discrepancy === "report-absent" ||
    discrepancy === "report-extra" ||
    sameScopeDataPoints.length === 0
  ) {
    return discrepancy;
  }
  if (
    (discrepancy === "error" ||
      discrepancy === "small-error" ||
      discrepancy === "hallucination") &&
    stageValue !== null
  ) {
    for (const otherDP of sameScopeDataPoints) {
      const otherProdValue = getDataPointValue(prodEmissions, otherDP.id);
      if (
        otherProdValue !== null &&
        Math.abs(stageValue - otherProdValue) <= 0.5
      ) {
        return "category-error";
      }
    }
  }
  if (discrepancy === "missing" && prodValue !== null) {
    for (const otherDP of sameScopeDataPoints) {
      const otherStageValue = getDataPointValue(stageEmissions, otherDP.id);
      if (
        otherStageValue !== null &&
        Math.abs(prodValue - otherStageValue) <= 0.5
      ) {
        return "category-error";
      }
    }
  }
  return discrepancy;
}

/**
 * Mutate comparison rows to set category-error, matchedDataPoint, and categoryErrorKind where applicable.
 */
export function applyCategoryErrorToRows(
  rows: CompanyRow[],
  stageMap: Map<string, Company>,
  prodMap: Map<string, Company>,
  sameScopeDataPoints: SameScopeDataPoint[],
  selectedDataPoint: string,
  selectedDataYear: number,
  selectedReportYear?: number | null,
): void {
  for (const row of rows) {
    if (
      row.discrepancy === "identical" ||
      row.discrepancy === "rounding" ||
      row.discrepancy === "both-null" ||
      row.discrepancy === "report-absent" ||
      row.discrepancy === "report-extra"
    )
      continue;

    const stageCompany = stageMap.get(crossEnvKeyFromRow(row));
    const prodCompany = prodMap.get(crossEnvKeyFromRow(row));

    if (
      (row.discrepancy === "error" ||
        row.discrepancy === "small-error" ||
        row.discrepancy === "hallucination") &&
      row.stageValue !== null &&
      prodCompany
    ) {
      const shellKey = row.shellKey ?? "";
      const prodRP = findReportingPeriodForShell(
        prodCompany.reportingPeriods,
        selectedDataYear,
        selectedReportYear ?? null,
        shellKey,
      );
      const stageRPForKind = stageCompany
        ? findReportingPeriodForShell(
            stageCompany.reportingPeriods,
            selectedDataYear,
            selectedReportYear ?? null,
            shellKey,
          )
        : null;
      for (const otherDP of sameScopeDataPoints) {
        const otherProdValue = getDataPointValue(prodRP?.emissions, otherDP.id);
        if (
          otherProdValue !== null &&
          Math.abs(row.stageValue! - otherProdValue) <= 0.5
        ) {
          row.discrepancy = "category-error";
          row.matchedDataPoint = otherDP.label;
          const otherStageValue = stageRPForKind
            ? getDataPointValue(stageRPForKind.emissions, otherDP.id)
            : null;
          if (
            otherStageValue !== null &&
            Math.abs(row.stageValue! - otherStageValue) <= 0.5
          ) {
            row.categoryErrorKind = "duplicating";
          } else if (
            row.prodValue !== null &&
            otherStageValue !== null &&
            Math.abs(otherStageValue - row.prodValue) <= 0.5
          ) {
            row.categoryErrorKind = "swap";
          } else if (GENERIC_DATA_POINTS.has(selectedDataPoint)) {
            row.categoryErrorKind = "conservative";
          } else if (GENERIC_DATA_POINTS.has(otherDP.id)) {
            row.categoryErrorKind = "overcategorized";
          } else {
            row.categoryErrorKind = "mix-up";
          }
          break;
        }
      }
    }

    if (
      row.discrepancy === "missing" &&
      row.prodValue !== null &&
      stageCompany
    ) {
      const stageRP = findReportingPeriodForShell(
        stageCompany.reportingPeriods,
        selectedDataYear,
        selectedReportYear ?? null,
        row.shellKey ?? "",
      );
      for (const otherDP of sameScopeDataPoints) {
        const otherStageValue = getDataPointValue(
          stageRP?.emissions,
          otherDP.id,
        );
        if (
          otherStageValue !== null &&
          Math.abs(row.prodValue - otherStageValue) <= 0.5
        ) {
          row.discrepancy = "category-error";
          row.matchedDataPoint = otherDP.label;
          if (GENERIC_DATA_POINTS.has(otherDP.id)) {
            row.categoryErrorKind = "conservative";
          } else if (GENERIC_DATA_POINTS.has(selectedDataPoint)) {
            row.categoryErrorKind = "overcategorized";
          } else {
            row.categoryErrorKind = "mix-up";
          }
          break;
        }
      }
    }
  }
}
