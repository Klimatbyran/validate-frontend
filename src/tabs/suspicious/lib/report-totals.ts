import { extractTotal } from "@/tabs/errors/lib";
import type { ReportingPeriod } from "@/tabs/errors/types";

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
 * Best available whole-footprint figure for a reporting period: the company's
 * own stated total, else scope 1 + 2 + 3 from whatever parts are present.
 * Used as the denominator when normalising values by company size.
 */
export function periodTotalEmissions(
  emissions: Emissions | null | undefined,
): number | null {
  const stated = statedTotalEmissions(emissions);
  if (stated !== null && stated > 0) return stated;

  const parts = [
    scope1Value(emissions),
    scope2Value(emissions),
    scope3Total(emissions),
  ].filter((part): part is number => part !== null);

  if (parts.length === 0) return null;
  const sum = parts.reduce((total, part) => total + part, 0);
  return sum > 0 ? sum : null;
}
