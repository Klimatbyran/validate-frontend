/**
 * Error-browser utils barrel.
 * Implementation lives in: api, emissions, discrepancy, metrics, csv.
 */

export {
  getStagePipelineCompaniesListUrl,
  getProdPipelineCompaniesListUrl,
} from './api';
export {
  pickReportingPeriodsForFilters,
  buildReportingPeriodComparisonSlots,
  findReportingPeriodForShell,
} from './reporting-period-comparison';
export type { ReportingPeriodComparisonSlot } from './reporting-period-comparison';
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
  isProdReportingPeriodFullyVerified,
} from './verification';
