export type CoverageMatchedCompany = {
  wikidataId: string;
  name: string;
};

export type CoverageYearSummary = {
  year: number;
  totalNames: number;
  matchedCount: number;
  ambiguousCount: number;
  coveragePercent: number;
};

export type CoverageListSummary = {
  id: string;
  name: string;
  updatedAt: string;
  years: CoverageYearSummary[];
};

export type CoverageEntryStatus = "matched" | "missing" | "ambiguous";

export type CoverageEntry = {
  id: string;
  name: string;
  status: CoverageEntryStatus;
  matchedCompany?: CoverageMatchedCompany;
};

export type CoverageYearDetail = CoverageYearSummary & {
  listId: string;
  listName: string;
  entries: CoverageEntry[];
};

export type CoverageEntryFilter = "all" | CoverageEntryStatus;
