import { z } from "zod";

export const coverageMatchedCompanySchema = z.object({
  wikidataId: z.string(),
  name: z.string(),
});

export const coverageYearSummarySchema = z.object({
  year: z.number(),
  totalNames: z.number(),
  matchedCount: z.number(),
  ambiguousCount: z.number(),
  coveragePercent: z.number(),
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

export const coverageEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: coverageEntryStatusSchema,
  matchMethod: coverageMatchMethodSchema.optional(),
  matchedCompany: coverageMatchedCompanySchema.optional(),
});

export const coverageCompanySearchHitSchema = z.object({
  id: z.string(),
  name: z.string(),
  wikidataId: z.string(),
});

export const coverageCompanySearchResponseSchema = z.array(
  coverageCompanySearchHitSchema,
);

export const coverageYearDetailSchema = coverageYearSummarySchema.extend({
  listId: z.string(),
  listName: z.string(),
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
