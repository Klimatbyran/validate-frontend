// Discrepancy types
export type DiscrepancyType = 'identical' | 'hallucination' | 'missing' | 'rounding' | 'unit-error' | 'small-error' | 'error' | 'category-error' | 'both-null';
export type CategoryErrorKind = 'conservative' | 'swap' | 'mix-up' | 'overcategorized' | 'duplicating';

export type ErrorBrowserViewMode = 'browser' | 'overview' | 'worst';

// Generic/catch-all data points where placing a value is "conservative"
export const GENERIC_DATA_POINTS = new Set(['scope2-unknown', 'cat-16']);

// Data point options grouped by scope
export const DATA_POINTS = [
  // Scope 1
  { id: 'scope1-total', label: 'Scope 1 Total', scope: 'scope1' },
  // Scope 2
  { id: 'scope2-mb', label: 'Scope 2 Market-based', scope: 'scope2' },
  { id: 'scope2-lb', label: 'Scope 2 Location-based', scope: 'scope2' },
  { id: 'scope2-unknown', label: 'Scope 2 Unknown', scope: 'scope2' },
  // Scope 3 categories
  { id: 'cat-1', label: 'Cat 1 - Purchased goods & services', category: 1, scope: 'scope3' },
  { id: 'cat-2', label: 'Cat 2 - Capital goods', category: 2, scope: 'scope3' },
  { id: 'cat-3', label: 'Cat 3 - Fuel & energy related', category: 3, scope: 'scope3' },
  { id: 'cat-4', label: 'Cat 4 - Upstream transport', category: 4, scope: 'scope3' },
  { id: 'cat-5', label: 'Cat 5 - Waste', category: 5, scope: 'scope3' },
  { id: 'cat-6', label: 'Cat 6 - Business travel', category: 6, scope: 'scope3' },
  { id: 'cat-7', label: 'Cat 7 - Employee commuting', category: 7, scope: 'scope3' },
  { id: 'cat-8', label: 'Cat 8 - Upstream leased assets', category: 8, scope: 'scope3' },
  { id: 'cat-9', label: 'Cat 9 - Downstream transport', category: 9, scope: 'scope3' },
  { id: 'cat-10', label: 'Cat 10 - Processing of sold products', category: 10, scope: 'scope3' },
  { id: 'cat-11', label: 'Cat 11 - Use of sold products', category: 11, scope: 'scope3' },
  { id: 'cat-12', label: 'Cat 12 - End-of-life treatment', category: 12, scope: 'scope3' },
  { id: 'cat-13', label: 'Cat 13 - Downstream leased assets', category: 13, scope: 'scope3' },
  { id: 'cat-14', label: 'Cat 14 - Franchises', category: 14, scope: 'scope3' },
  { id: 'cat-15', label: 'Cat 15 - Investments', category: 15, scope: 'scope3' },
  // Other
  { id: 'cat-16', label: 'Cat 16 - Other', category: 16, scope: 'other' },
  { id: 'scope3-stated-total', label: 'Scope 3 Stated Total', scope: 'other' },
  { id: 'scope3-calculated-total', label: 'Scope 3 Calculated Total', scope: 'other' },
  { id: 'stated-total', label: 'Stated Total Emissions (All)', scope: 'other' },
  { id: 'calculated-total', label: 'Calculated Total Emissions (All)', scope: 'other' },
];

export interface Company {
  wikidataId: string;
  name: string;
  reportingPeriods?: ReportingPeriod[];
}

export interface ReportingPeriod {
  startDate: string;
  endDate: string;
  emissions?: {
    statedTotalEmissions?: { total?: number | null } | number | null;
    calculatedTotalEmissions?: { total?: number | null } | number | null;
    scope1?: {
      total?: number | null;
    };
    scope2?: {
      mb?: number | null;
      lb?: number | null;
      unknown?: number | null;
    };
    scope3?: {
      statedTotalEmissions?: { total?: number | null } | number | null;
      calculatedTotalEmissions?: { total?: number | null } | number | null;
      categories?: Array<{
        category: number;
        total: number | null;
      }>;
    };
  };
}

export interface CompanyRow {
  wikidataId: string;
  name: string;
  stageValue: number | null;
  prodValue: number | null;
  discrepancy: DiscrepancyType;
  diff: number | null;
  inStage: boolean;
  inProd: boolean;
  matchedDataPoint?: string;
  categoryErrorKind?: CategoryErrorKind;
  unitErrorFactor?: number;
}

export interface DataPointMetric {
  id: string;
  label: string;
  shortLabel: string;
  tolerantRate: number;
  tolerantSuccess: number;
  withAnyData: number;
  breakdown: {
    identical: number;
    rounding: number;
    hallucination: number;
    missing: number;
    unitError: number;
    smallError: number;
    error: number;
    categoryError: number;
    bothNull: number;
  };
}

export interface WorstCompany {
  wikidataId: string;
  name: string;
  errorCount: number;
  totalDataPoints: number;
  breakdown: Record<string, number>;
  errorDataPoints: Array<{ label: string; discrepancy: DiscrepancyType }>;
}
