/** Slug format for tag options: lowercase letters, digits, hyphens only. Enforced by API. */
export const TAG_OPTION_SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Special option value used in tag filter dropdowns to show companies with no tags.
 * Guaranteed not to collide with real tag slugs due to TAG_OPTION_SLUG_REGEX.
 */
export const NO_TAGS_FILTER_OPTION = "__no_tags__";

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
  /** Internal Garbo company id (CUID). */
  id: string;
  wikidataId?: string | null;
  name: string;
  tags?: string[];
  /** Present when list API includes base year (number or wrapped shape with metadata). */
  baseYear?:
    | number
    | { year?: number | null; metadata?: GarboMinimalMetadata | null }
    | null;
  /** If list API returns industry (e.g. for sector filter). */
  industry?: {
    subIndustryCode?: string;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  reportingPeriods?: GarboReportingPeriodSummary[];
  /** True if any emissions field has no verifiedBy (computed by Garbo). */
  hasUnverifiedEmissions?: boolean;
  /** True if any verifiable field (emissions, economy, industry, baseYear) has no verifiedBy (computed by Garbo). */
  hasUnverifiedData?: boolean;
}

/** Registry Report row linked from CompanyReport.registryReportId. */
export interface GarboRegistryReportSummary {
  id?: string;
  url?: string | null;
  sourceUrl?: string | null;
  s3Url?: string | null;
  reportYear?: string | null;
  sha256?: string | null;
}

/** Linked processed PDF (CompanyReport) for a reporting period. */
export interface GarboCompanyReportSummary {
  id?: string;
  reportYear?: string | null;
  reportPublicationDate?: string | null;
  registryReportId?: string | null;
  createdAt?: string | null;
  report?: GarboRegistryReportSummary | null;
}

/** Summary of a reporting period (for list/grid). */
export interface GarboReportingPeriodSummary {
  id?: string;
  startDate: string;
  endDate: string;
  /** Data year key in DB (may differ from PDF catalog year on CompanyReport). */
  year?: string | null;
  companyReportId?: string | null;
  companyReport?: GarboCompanyReportSummary | null;
  reportURL?: string | null;
  /** Original source URL (e.g. crawler page). */
  sourceUrl?: string | null;
  /** S3 URL for the stored report file. */
  s3Url?: string | null;
  /**
   * Backwards/alternate API field names we may receive from Garbo.
   * Normalize to `sourceUrl` / `s3Url` in `companies-api.ts`.
   */
  reportSourceUrl?: string | null;
  reportS3Url?: string | null;
  /** Legacy/alternate API casing for source URL. */
  sourceURL?: string | null;
  /** Legacy/alternate API casing for S3 URL. */
  s3URL?: string | null;
  emissions?: GarboEmissionsSummary;
  economy?: GarboEconomySummary;
}

export interface GarboMinimalMetadata {
  user?: { name?: string | null } | null;
  verifiedBy?: { name: string } | null;
}

/** Field-level metadata returned by Garbo (audit / verification). */
export interface GarboFieldMetadata extends GarboMinimalMetadata {
  source?: string | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  verifiedAt?: string | null;
  parsedAt?: string | null;
}

export interface GarboEmissionsSummary {
  scope1?: {
    total?: number | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  scope2?: {
    mb?: number | null;
    lb?: number | null;
    unknown?: number | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  scope1And2?: {
    total?: number | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  scope3?: {
    metadata?: GarboMinimalMetadata | null;
    statedTotalEmissions?: {
      total?: number | null;
      metadata?: GarboMinimalMetadata | null;
    } | null;
    categories?: Array<{
      category: number;
      total?: number | null;
      metadata?: GarboMinimalMetadata | null;
    }>;
  } | null;
  biogenic?: { total?: number | null } | null;
  statedTotalEmissions?: {
    total?: number | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
}

export interface GarboEconomySummary {
  turnover?: {
    value?: number | null;
    currency?: string | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  employees?: {
    value?: number | null;
    unit?: string | null;
    metadata?: GarboMinimalMetadata | null;
  } | null;
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
  goals?: Array<{
    id: string;
    description?: string;
    year?: number;
    target?: string;
    baseYear?: number;
  }>;
  initiatives?: Array<{
    id: string;
    title: string;
    description?: string;
    year?: number;
    scope?: string;
  }>;
  reportingPeriods?: GarboReportingPeriodDetail[];
}

export interface GarboReportingPeriodDetail
  extends GarboReportingPeriodSummary {
  id: string;
}

/** Metadata sent with update requests. */
export interface GarboMetadata {
  source?: string;
  comment?: string;
}

// --- Editor UI helper types ---

export type EditState = {
  companyId: string;
  companyName: string;
  field: "tags" | "reportURL" | "scope1" | "scope2" | "economy";
  year?: number;
  startDate?: string;
  endDate?: string;
  currentValue: string | number | null;
};
