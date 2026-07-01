/** Slug format enforced by API. */
export const TAG_OPTION_SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Filter value for companies with no tags. Won't collide with real slugs (see TAG_OPTION_SLUG_REGEX).
 */
export const NO_TAGS_FILTER_OPTION = "__no_tags__";

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

export const WIKIDATA_ID_REGEX = /^Q\d+$/;

export interface GarboCompanyListItem {
  id: string;
  wikidataId?: string | null;
  name: string;
  tags?: string[];
  baseYear?:
    | number
    | { year?: number | null; metadata?: GarboMinimalMetadata | null }
    | null;
  industry?: {
    subIndustryCode?: string;
    metadata?: GarboMinimalMetadata | null;
  } | null;
  reportingPeriods?: GarboReportingPeriodSummary[];
  hasUnverifiedEmissions?: boolean;
  hasUnverifiedData?: boolean;
  identifiers?: GarboCompanyIdentifier[];
}

export interface GarboRegistryReportSummary {
  id?: string;
  url?: string | null;
  sourceUrl?: string | null;
  s3Url?: string | null;
  reportYear?: string | null;
  sha256?: string | null;
  wikidataId?: string | null;
}

export interface GarboCompanyReportSummary {
  id: string;
  reportYear?: string | null;
  reportPublicationDate?: string | null;
  registryReportId?: string | null;
  createdAt?: string | null;
  report?: GarboRegistryReportSummary | null;
}

export interface GarboReportingPeriodSummary {
  id?: string;
  startDate: string;
  endDate: string;
  /** DB data year; may differ from CompanyReport.reportYear (PDF catalog year). */
  year?: string | null;
  companyReportId?: string | null;
  companyReport?: GarboCompanyReportSummary | null;
  reportURL?: string | null;
  sourceUrl?: string | null;
  s3Url?: string | null;
  /**
   * Alternate Garbo field names — normalized to sourceUrl/s3Url in companies-api.ts.
   */
  reportSourceUrl?: string | null;
  reportS3Url?: string | null;
  sourceURL?: string | null;
  s3URL?: string | null;
  emissions?: GarboEmissionsSummary;
  economy?: GarboEconomySummary;
}

/** One period in POST /api/companies/:id/reporting-periods. */
export type ReportingPeriodWritePayload = {
  startDate: string;
  endDate: string;
  companyReportId?: string;
  reportURL?: string | null;
  reportS3Url?: string | null;
  reportSha256?: string | null;
  emissions?: Record<string, unknown>;
  economy?: Record<string, unknown>;
};

export interface GarboMinimalMetadata {
  user?: { name?: string | null } | null;
  verifiedBy?: { name: string } | null;
  source?: string | null;
  comment?: string | null;
}

export type GarboCompanyIdentifierType =
  | "WIKIDATA"
  | "LEI"
  | "ORG_NUMBER"
  | "ISIN";

export interface GarboCompanyIdentifier {
  id: string;
  type: GarboCompanyIdentifierType;
  value: string;
  metadata?: GarboMinimalMetadata | null;
}

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

export interface GarboCompanyDetail extends GarboCompanyListItem {
  url?: string | null;
  logoUrl?: string | null;
  lei?: string | null;
  internalComment?: string | null;
  identifiers?: GarboCompanyIdentifier[];
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

export interface GarboMetadata {
  source?: string;
  comment?: string;
}

export type EditState = {
  companyId: string;
  companyName: string;
  field: "tags" | "reportURL" | "scope1" | "scope2" | "economy";
  year?: number;
  startDate?: string;
  endDate?: string;
  companyReportId?: string;
  currentValue: string | number | null;
};
