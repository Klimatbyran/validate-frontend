/**
 * Error-browser utils barrel.
 * Implementation lives in: api, emissions, discrepancy, metrics, csv.
 */

export { getStageApiUrl, getProdApiUrl } from './api';
export {
  extractTotal,
  pickReportingPeriodForYear,
  getCategoryValue,
  getDataPointValue,
} from './emissions';
export {
  companiesToMapById,
  classifyDiscrepancy,
  reclassifyDiscrepancyForCategoryError,
  applyCategoryErrorToRows,
} from './discrepancy';
export type { SameScopeDataPoint } from './discrepancy';
export {
  computePerformanceMetrics,
  calculateOverviewAggregates,
} from './metrics';
export type {
  PerformanceMetricRow,
  OverviewAggregates,
} from './metrics';
export { exportOverviewCsv, exportComparisonToCsv } from './csv';

/** Format a numeric value for display (or "—" when null). */
export function formatValue(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('sv-SE');
}
