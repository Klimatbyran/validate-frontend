import { z } from "zod";
import { WIKIDATA_ID_REGEX } from "./types";

/** Garbo internal `Company.id` (CUID). Distinct from `wikidataId`. */
export const garboCompanyIdSchema = z.string().uuid();

/** Minimal company shape from GET /api/companies (list). */
export const garboCompanyListItemSchema = z
  .object({
    id: garboCompanyIdSchema,
    wikidataId: z.string().regex(WIKIDATA_ID_REGEX).nullable().optional(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    baseYear: z.unknown().optional(),
    industry: z.unknown().optional(),
    reportingPeriods: z.array(z.unknown()).optional(),
    hasUnverifiedEmissions: z.boolean().optional(),
    hasUnverifiedData: z.boolean().optional(),
  })
  .passthrough();

/** Company detail from GET /api/internal-companies/:wikidataId. */
export const garboCompanyDetailSchema = garboCompanyListItemSchema
  .extend({
    url: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    lei: z.string().nullable().optional(),
    internalComment: z.string().nullable().optional(),
    descriptions: z.array(z.unknown()).optional(),
    goals: z.array(z.unknown()).nullable().optional(),
    initiatives: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough();

export function parseGarboCompanyListItem(raw: unknown) {
  return garboCompanyListItemSchema.parse(raw);
}

export function parseGarboCompanyDetail(raw: unknown) {
  return garboCompanyDetailSchema.parse(raw);
}
