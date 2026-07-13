import { z } from "zod";

export const coverageMatchedCompanySchema = z.object({
  id: z.string(),
  wikidataId: z.string().nullable(),
  name: z.string(),
});

export const coverageYearSummarySchema = z.object({
  year: z.number(),
  totalNames: z.number(),
  matchedCount: z.number(),
  ambiguousCount: z.number(),
  coveragePercent: z.number(),
  hasAnyReportCount: z.number().optional(),
  prodReadyCount: z.number().optional(),
  noReportCount: z.number().optional(),
});

export const coverageListSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  updatedAt: z.string(),
  years: z.array(coverageYearSummarySchema),
});

export const coverageEntryStatusSchema = z.enum([
  "matched",
  "missing",
  "ambiguous",
]);

export const coverageMatchMethodSchema = z.enum(["auto", "manual"]);

export const registryReportPillSchema = z.object({
  reportId: z.string(),
  reportYear: z.string().nullable(),
  companyName: z.string().nullable(),
  wikidataId: z.string().nullable(),
  url: z.string(),
  sourceUrl: z.string().nullable(),
  matchMethod: z.enum(["wikidata", "name"]),
  prodReady: z.boolean(),
});

export const coverageEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: coverageEntryStatusSchema,
  matchMethod: coverageMatchMethodSchema.optional(),
  matchedCompany: coverageMatchedCompanySchema.optional(),
  registryReports: z.array(registryReportPillSchema).default([]),
});

export const coverageCompanySearchHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  wikidataId: z.string().nullable(),
});

export const coverageCompanySearchResponseSchema = z.array(
  coverageCompanySearchHitSchema,
);

export const coverageYearDetailSchema = coverageYearSummarySchema.extend({
  listId: z.string(),
  listName: z.string(),
  hasAnyReportCount: z.number().default(0),
  prodReadyCount: z.number().default(0),
  noReportCount: z.number().default(0),
  entries: z.array(coverageEntrySchema),
});

export const coverageListCollectionSchema = z.object({
  lists: z.array(coverageListSummarySchema),
});

export type CoverageMatchedCompany = z.infer<
  typeof coverageMatchedCompanySchema
>;
export type CoverageYearSummary = z.infer<typeof coverageYearSummarySchema>;
export type CoverageListSummary = z.infer<typeof coverageListSummarySchema>;
export type CoverageEntryStatus = z.infer<typeof coverageEntryStatusSchema>;
export type CoverageEntry = z.infer<typeof coverageEntrySchema>;
export type CoverageYearDetail = z.infer<typeof coverageYearDetailSchema>;
export type CoverageCompanySearchHit = z.infer<
  typeof coverageCompanySearchHitSchema
>;

export type CoverageMatchSaveAction =
  | { type: "match"; companyId: string; companyName: string }
  | { type: "clear" }
  | { type: "markMissing" };

export type RegistryReportPill = z.infer<typeof registryReportPillSchema>;

export type CoverageEntryFilter =
  | "all"
  | "matched"
  | "missing"
  | "ambiguous"
  | "registryInProd"
  | "registryOnly"
  | "registryMissing";
