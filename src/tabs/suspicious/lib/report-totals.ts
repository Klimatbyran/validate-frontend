import { extractTotal } from "@/tabs/errors/lib";
import type { ReportingPeriod } from "@/tabs/errors/types";
import { relativeDifference } from "./stats";
import { SUSPICION_CONFIG } from "./suspicion-config";

type Emissions = ReportingPeriod["emissions"];

export interface Scope3CategoryValue {
  category: number;
  dataPointId: string;
  value: number;
}

export function scope3StatedTotal(
  emissions: Emissions | null | undefined,
): number | null {
  return extractTotal(emissions?.scope3?.statedTotalEmissions);
}

/** Scope 3 categories with a numeric value, category 16 ("Other") included. */
export function scope3CategoryValues(
  emissions: Emissions | null | undefined,
): Scope3CategoryValue[] {
  const categories = emissions?.scope3?.categories;
  if (!Array.isArray(categories)) return [];

  return categories
    .filter(
      (category): category is { category: number; total: number } =>
        typeof category.total === "number" && Number.isFinite(category.total),
    )
    .map((category) => ({
      category: category.category,
      dataPointId: `cat-${category.category}`,
      value: category.total,
    }));
}

export function scope3CategorySum(
  emissions: Emissions | null | undefined,
): number | null {
  const categories = scope3CategoryValues(emissions);
  if (categories.length === 0) return null;
  return categories.reduce((sum, category) => sum + category.value, 0);
}

/** Stated scope 3 total when present, else the sum of its categories. */
export function scope3Total(
  emissions: Emissions | null | undefined,
): number | null {
  return scope3StatedTotal(emissions) ?? scope3CategorySum(emissions);
}

/**
 * The scope 2 figure to use in a total. Market-based is the GHG Protocol's
 * preferred number, then location-based, then the unlabelled one.
 */
export function scope2Value(
  emissions: Emissions | null | undefined,
): number | null {
  const scope2 = emissions?.scope2;
  if (!scope2) return null;
  if (typeof scope2.mb === "number") return scope2.mb;
  if (typeof scope2.lb === "number") return scope2.lb;
  if (typeof scope2.unknown === "number") return scope2.unknown;
  return null;
}

export function scope1Value(
  emissions: Emissions | null | undefined,
): number | null {
  return extractTotal(emissions?.scope1);
}

export function statedTotalEmissions(
  emissions: Emissions | null | undefined,
): number | null {
  return extractTotal(emissions?.statedTotalEmissions);
}

/**
 * Best available whole-footprint figure for a reporting period, used as the
 * denominator when normalising values by company size.
 *
 * Takes the larger of the company's stated total and the sum of its scopes.
 * A stated total that is smaller than the parts it should contain is itself
 * one of the things this tab flags, and using it as a denominator would turn
 * that single bad total into a suspicious share for every other value in the
 * report.
 */
export function periodTotalEmissions(
  emissions: Emissions | null | undefined,
): number | null {
  const stated = statedTotalEmissions(emissions);

  const parts = [
    scope1Value(emissions),
    scope2Value(emissions),
    scope3Total(emissions),
  ].filter((part): part is number => part !== null);

  const sum = parts.length
    ? parts.reduce((total, part) => total + part, 0)
    : null;

  const candidates = [stated, sum].filter(
    (candidate): candidate is number => candidate !== null && candidate > 0,
  );

  return candidates.length ? Math.max(...candidates) : null;
}

/**
 * Whether a period's own numbers agree well enough for its total to be used as
 * a denominator.
 *
 * A single wrong value distorts every share computed against the total it
 * feeds, which would smear one bad figure across all its siblings. When the
 * parts and the totals disagree, the inconsistency rules report that directly
 * and the share comparison sits the period out.
 */
export function isPeriodTotalTrustworthy(
  emissions: Emissions | null | undefined,
): boolean {
  const scope3Stated = scope3StatedTotal(emissions);
  const categorySum = scope3CategorySum(emissions);

  if (scope3Stated !== null && categorySum !== null) {
    const scope3Gap = relativeDifference(scope3Stated, categorySum);
    if (
      scope3Gap === null ||
      scope3Gap >= SUSPICION_CONFIG.scope3Sum.flagRelative
    ) {
      return false;
    }
  }

  const stated = statedTotalEmissions(emissions);
  if (stated === null) return true;

  const parts = [
    scope1Value(emissions),
    scope2Value(emissions),
    scope3Total(emissions),
  ].filter((part): part is number => part !== null);

  if (parts.length < 3) return true;

  const sum = parts.reduce((total, part) => total + part, 0);
  const gap = relativeDifference(stated, sum);
  return gap !== null && gap < SUSPICION_CONFIG.totalSum.flagRelative;
}
