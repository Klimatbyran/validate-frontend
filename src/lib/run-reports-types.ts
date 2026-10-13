/**
 * Minimal row for pipeline URL jobs (upload, editor report runs, etc.).
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
