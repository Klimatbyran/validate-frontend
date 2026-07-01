import { z } from "zod";
import { WIKIDATA_ID_REGEX } from "./types";

/** Garbo internal `Company.id` (UUID). Distinct from `wikidataId`. */
export const garboCompanyIdSchema = z.string().uuid();

const garboMinimalMetadataSchema = z
  .object({
    user: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
    verifiedBy: z
      .object({ name: z.string() })
      .nullable()
      .optional(),
    source: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
  })
  .passthrough();

export const garboCompanyIdentifierSchema = z.object({
  id: z.string(),
  type: z.enum(["WIKIDATA", "LEI", "ORG_NUMBER", "ISIN"]),
  value: z.string(),
  metadata: garboMinimalMetadataSchema.nullable().optional(),
});

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
    identifiers: z.array(garboCompanyIdentifierSchema).optional(),
  })
  .passthrough();

/** Company detail from GET /api/pipeline/companies/:ref. */
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
