/** Toggle crawler / coverage discovery features in Validate. */
export const CRAWLER_FEATURES = {
  /** Bulk LLM crawl + auto-save on the Crawler tab. */
  autoSearch: false,
  /** "Search online" crawl in the coverage find-report dialog. */
  coverageSearchOnline: false,
} as const;
