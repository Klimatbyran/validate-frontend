/**
 * Filter bar configuration: rerun workers, limit options, and filter definitions.
 * Used by FilterBar and FilterBarRerunSection.
 */

import type { FilterType } from "./swimlane-filters";

/** Re-export shared pipeline workers for jobstatus rerun UI. */
export type { RunOnlyWorkerId as RerunWorker } from "@/lib/run-only-workers";
export { RUN_ONLY_WORKERS as RERUN_WORKERS } from "@/lib/run-only-workers";

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
