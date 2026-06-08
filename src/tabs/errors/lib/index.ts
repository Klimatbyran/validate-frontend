/**
 * Error-browser utils barrel.
 * Implementation lives in: api, emissions, discrepancy, metrics, csv.
 */

export { getStageApiUrl, getProdApiUrl } from './api';
export {
  extractTotal,
  pickReportingPeriodForYear,
  pickReportingPeriodForFilters,
  getPeriodReportYearFromApi,
  getCategoryValue,
  getDataPointValue,
  getDataPointVerified,
} from './emissions';
export {
  companiesToMapById,
  classifyDiscrepancy,
  getUnitErrorFactor,
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
export {
  buildProdCompanyVerifiedForYearMap,
  isProdCompanyFullyVerifiedForYear,
} from './verification';
