/**
 * Minimal row for “run reports” / pipeline URL jobs (registry entries, crawler picks, etc.).
 * Keeps shared UI decoupled from `tabs/registry` types.
 */
export type RunReportListItem = {
  id?: string;
  url: string;
  /** Garbo Company.id when the caller already knows the canonical company. */
  companyId?: string | null;
  companyName?: string | null;
  wikidataId?: string | null;
  reportYear?: string | null;
};
