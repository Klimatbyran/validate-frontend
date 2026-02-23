/**
 * Filter bar configuration: rerun workers, limit options, and filter definitions.
 * Used by FilterBar and FilterBarRerunSection.
 */

import type { FilterType } from "./swimlane-filters";

export type RerunWorker = "scope1" | "scope2" | "scope3" | "economy" | "baseYear" | "industryGics";

export const RERUN_WORKERS: Array<{ id: RerunWorker; label: string }> = [
  { id: "scope1", label: "Scope 1" },
  { id: "scope2", label: "Scope 2" },
  { id: "scope3", label: "Scope 3" },
  { id: "economy", label: "Ekonomi" },
  { id: "baseYear", label: "Basår" },
  { id: "industryGics", label: "Bransch GICS" },
];

export const LIMIT_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 1, label: "1" },
  { value: 5, label: "5" },
  { value: "all", label: "Alla" },
];

export interface PrimaryFilterConfig {
  id: FilterType;
  label: string;
  badgeColorClass: string;
  activeColor: string;
}

export const PRIMARY_FILTER_CONFIG: PrimaryFilterConfig[] = [
  { id: "pending_approval", label: "Väntar på godkännande", badgeColorClass: "bg-orange-03/20 text-orange-03", activeColor: "bg-orange-03 text-white hover:bg-orange-03/90" },
  { id: "has_failed", label: "Har misslyckade", badgeColorClass: "bg-pink-03/20 text-pink-03", activeColor: "bg-pink-03 text-white hover:bg-pink-03/90" },
  { id: "has_processing", label: "Bearbetar", badgeColorClass: "bg-blue-03/20 text-blue-03", activeColor: "bg-blue-03 text-white hover:bg-blue-03/90" },
  { id: "has_issues", label: "Har problem", badgeColorClass: "bg-orange-03/20 text-orange-03", activeColor: "bg-orange-03 text-white hover:bg-orange-03/90" },
];

export const SECONDARY_FILTER_CONFIG: Array<{ id: FilterType; label: string }> = [
  { id: "fully_completed", label: "Fullständigt klart" },
  { id: "preprocessing_issues", label: "Preprocessing-problem" },
  { id: "data_extraction_issues", label: "Dataextraktion-problem" },
  { id: "finalize_issues", label: "Finalisering-problem" },
];
