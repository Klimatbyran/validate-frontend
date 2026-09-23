/**
 * Report types worth auto-saving for an emissions/climate baseline.
 * Keep in sync with API `emissionsRelevantReportTypes.ts`.
 */
export const EMISSIONS_RELEVANT_REPORT_TYPE_SLUGS = [
  "sustainability-report",
  "esg-report",
  "climate-report",
  "climate-plan",
  "ghg-emissions-report",
  "carbon-emissions-report",
  "adaption-report",
  "non-financial-report",
  "sustainable-development-report",
  "tcfd",
  "integrated-report",
  "annual-report",
  "annual-securities-report",
  "csr-report",
  "corporate-responsibility-report",
  "impact-report",
  "green-bond-report",
  "universal-registration-document",
] as const;

const EMISSIONS_RELEVANT_SLUG_SET = new Set<string>(
  EMISSIONS_RELEVANT_REPORT_TYPE_SLUGS,
);

export function isEmissionsRelevantReportTypeSlug(
  slug?: string | null,
): boolean {
  const normalized = slug?.trim();
  return Boolean(normalized && EMISSIONS_RELEVANT_SLUG_SET.has(normalized));
}
