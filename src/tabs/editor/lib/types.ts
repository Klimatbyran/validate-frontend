/** Slug format for tag options: lowercase letters, digits, hyphens only. Enforced by API. */
export const TAG_OPTION_SLUG_REGEX = /^[a-z0-9-]+$/;

/** Tag option from GET /api/tag-options (garbo). */
export interface TagOption {
  id: string;
  slug: string;
  label: string | null;
}

export interface CreateTagOptionBody {
  slug: string;
  label?: string | null;
}

export interface UpdateTagOptionBody {
  slug?: string;
  label?: string | null;
}

// --- Garbo company (editor) types ---

/** Wikidata ID format: Q + digits. */
export const WIKIDATA_ID_REGEX = /^Q\d+$/;

/** Minimal company from Garbo GET /api/companies (list). */
export interface GarboCompanyListItem {
  wikidataId: string;
  name: string;
  tags?: string[];
  /** If list API returns industry (e.g. for sector filter). */
  industry?: { subIndustryCode?: string } | null;
  reportingPeriods?: GarboReportingPeriodSummary[];
  /** True if any emissions field has no verifiedBy (computed by Garbo). */
  hasUnverifiedEmissions?: boolean;
  /** True if any verifiable field (emissions, economy, industry, baseYear) has no verifiedBy (computed by Garbo). */
  hasUnverifiedData?: boolean;
}

/** Summary of a reporting period (for list/grid). */
export interface GarboReportingPeriodSummary {
  id?: string;
  startDate: string;
  endDate: string;
  reportURL?: string | null;
  emissions?: GarboEmissionsSummary;
  economy?: GarboEconomySummary;
}

export interface GarboEmissionsSummary {
  scope1?: { total?: number | null } | null;
  scope2?: { mb?: number | null; lb?: number | null; unknown?: number | null } | null;
  scope1And2?: { total?: number | null } | null;
  scope3?: { statedTotalEmissions?: { total?: number | null }; categories?: Array<{ category: number; total?: number | null }> } | null;
  biogenic?: { total?: number | null } | null;
  statedTotalEmissions?: { total?: number | null } | null;
}

export interface GarboEconomySummary {
  turnover?: { value?: number | null; currency?: string | null } | null;
  employees?: { value?: number | null; unit?: string | null } | null;
}

/** Full company detail from GET /api/companies/:wikidataId (for single-company edit). */
export interface GarboCompanyDetail extends GarboCompanyListItem {
  url?: string | null;
  logoUrl?: string | null;
  lei?: string | null;
  internalComment?: string | null;
  descriptions?: Array<{ id?: string; language: string; text: string }>;
  industry?: { subIndustryCode?: string } | null;
  baseYear?: number | null;
  goals?: Array<{ id: string; description?: string; year?: number; target?: string; baseYear?: number }>;
  initiatives?: Array<{ id: string; title: string; description?: string; year?: number; scope?: string }>;
  reportingPeriods?: GarboReportingPeriodDetail[];
}

export interface GarboReportingPeriodDetail extends GarboReportingPeriodSummary {
  id: string;
}

/** Metadata sent with update requests. */
export interface GarboMetadata {
  source?: string;
  comment?: string;
}
