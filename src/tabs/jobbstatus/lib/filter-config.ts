/**
 * Filter bar configuration: rerun workers, limit options, and filter definitions.
 * Labels are resolved via i18n: jobstatus.filters.*, jobstatus.rerunWorkers.*, jobstatus.limitAll.
 */

import type { FilterType } from "./swimlane-filters";

export type RerunWorker = "scope1" | "scope2" | "scope3" | "economy" | "baseYear" | "industryGics";

export const RERUN_WORKERS: Array<{ id: RerunWorker }> = [
  { id: "scope1" },
  { id: "scope2" },
  { id: "scope3" },
  { id: "economy" },
  { id: "baseYear" },
  { id: "industryGics" },
];

export const LIMIT_OPTIONS: Array<{ value: number | "all" }> = [
  { value: 1 },
  { value: 5 },
  { value: "all" },
];

export interface PrimaryFilterConfig {
  id: FilterType;
  badgeColorClass: string;
  activeColor: string;
}

export const PRIMARY_FILTER_CONFIG: PrimaryFilterConfig[] = [
  { id: "pending_approval", badgeColorClass: "bg-orange-03/20 text-orange-03", activeColor: "bg-orange-03 text-white hover:bg-orange-03/90" },
  { id: "has_failed", badgeColorClass: "bg-pink-03/20 text-pink-03", activeColor: "bg-pink-03 text-white hover:bg-pink-03/90" },
  { id: "has_processing", badgeColorClass: "bg-blue-03/20 text-blue-03", activeColor: "bg-blue-03 text-white hover:bg-blue-03/90" },
  { id: "has_issues", badgeColorClass: "bg-orange-03/20 text-orange-03", activeColor: "bg-orange-03 text-white hover:bg-orange-03/90" },
];

export const SECONDARY_FILTER_CONFIG: Array<{ id: FilterType }> = [
  { id: "fully_completed" },
  { id: "preprocessing_issues" },
  { id: "data_extraction_issues" },
  { id: "finalize_issues" },
];
