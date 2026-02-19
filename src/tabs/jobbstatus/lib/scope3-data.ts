/**
 * Types and data helpers for Scope 3 emissions (GHG Protocol categories).
 * Used by Scope3Section for normalization and reference comparison.
 */

export interface Scope3EmissionsData {
  scope3: Array<{
    year: number;
    scope3: {
      statedTotalEmissions: { total: number | null; unit: string | null };
      categories: Array<{
        id: string;
        category: number;
        total: number | null;
        unit: string | null;
        metadata?: any;
      }>;
      calculatedTotalEmissions?: number;
      metadata?: any;
    };
  }>;
}

export type ReferenceCategory = {
  id?: string;
  name?: string;
  total?: number | null;
  unit?: string | null;
  category?: number;
};
export type ReferenceSnapshot = {
  total?: number | null;
  unit?: string | null;
  categories?: ReferenceCategory[];
} | null;

export function buildReferenceSnapshotFromScope3(scope3: any): ReferenceSnapshot {
  if (!scope3) return null;
  const categories: ReferenceCategory[] = Array.isArray(scope3.categories)
    ? scope3.categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        total: category.total ?? null,
        unit: category.unit ?? null,
        category: category.category,
      }))
    : [];
  return {
    total: scope3.statedTotalEmissions?.total ?? null,
    unit: scope3.statedTotalEmissions?.unit ?? null,
    categories,
  };
}

/** Standard GHG Protocol Scope 3 category names (1..15) */
export const SCOPE3_CATEGORY_NAMES: Record<number, string> = {
  1: "Purchased goods and services",
  2: "Capital goods",
  3: "Fuel- and energy-related activities (not in Scope 1 or 2)",
  4: "Upstream transportation and distribution",
  5: "Waste generated in operations",
  6: "Business travel",
  7: "Employee commuting",
  8: "Upstream leased assets",
  9: "Downstream transportation and distribution",
  10: "Processing of sold products",
  11: "Use of sold products",
  12: "End-of-life treatment of sold products",
  13: "Downstream leased assets",
  14: "Franchises",
  15: "Investments",
};

export type NormalizedCategory = {
  key: string;
  label: string;
  total: number | null;
  unit: string | null;
  number?: number;
};
export type NormalizedYearEntry = {
  total: number | null;
  unit: string | null;
  categories: NormalizedCategory[];
};

export function normalizeYearEntry(entry: any): NormalizedYearEntry {
  const scope3 = entry.scope3;
  const total = scope3?.statedTotalEmissions?.total ?? null;
  const unit = scope3?.statedTotalEmissions?.unit ?? null;
  const rawCategories = scope3?.categories ?? [];
  const categories: NormalizedCategory[] = Array.isArray(rawCategories)
    ? rawCategories.map((rawCategory: any) => {
        const number = rawCategory.category;
        const label =
          SCOPE3_CATEGORY_NAMES[number] || `Category ${number}`;
        return {
          key: rawCategory.id || `cat-${number}`,
          label,
          total: rawCategory.total ?? null,
          unit: rawCategory.unit ?? null,
          number,
        };
      })
    : [];
  return { total, unit, categories };
}

export function buildOurNumberMapForYear(
  year: number,
  sortedScope3ByYear: any[]
): Record<number, { total: number | null; unit: string | null }> {
  const yearEntry = sortedScope3ByYear.find((e) => e.year === year);
  if (!yearEntry) return {};
  const normalized = normalizeYearEntry(yearEntry);
  const map: Record<
    number,
    { total: number | null; unit: string | null }
  > = {};
  for (const category of normalized.categories) {
    if (typeof category.number === "number") {
      map[category.number] = {
        total: category.total ?? null,
        unit: category.unit ?? null,
      };
    }
  }
  return map;
}

export function buildRefNumberMap(
  year: number,
  referenceByYear: Record<number, ReferenceSnapshot>
): Record<number, { total: number | null; unit: string | null }> {
  const map: Record<
    number,
    { total: number | null; unit: string | null }
  > = {};
  const snapshot = referenceByYear[year];
  if (!snapshot || !Array.isArray(snapshot.categories)) return map;
  for (const c of snapshot.categories) {
    if (typeof c.category === "number") {
      map[c.category] = { total: c.total ?? null, unit: c.unit ?? null };
    }
  }
  return map;
}
