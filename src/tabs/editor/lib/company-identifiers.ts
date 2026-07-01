import type { GarboCompanyDetail, GarboCompanyIdentifier } from "./types";

export function isIdentifierVerified(
  identifier: GarboCompanyIdentifier | undefined,
): boolean {
  return Boolean(identifier?.metadata?.verifiedBy);
}

export function identifierByType(
  company: GarboCompanyDetail,
  type: GarboCompanyIdentifier["type"],
): GarboCompanyIdentifier | undefined {
  return company.identifiers?.find((row) => row.type === type);
}

export function wikidataFromIdentifiers(
  company: GarboCompanyDetail,
): string | null {
  const row = identifierByType(company, "WIKIDATA");
  return row?.value?.trim() || company.wikidataId?.trim() || null;
}

export function leiFromIdentifiers(company: GarboCompanyDetail): string | null {
  const row = identifierByType(company, "LEI");
  return row?.value?.trim() || company.lei?.trim() || null;
}

/** Prefer internal id for editor URLs; fall back to wikidata when present. */
export function editorCompanyRef(company: {
  id: string;
  wikidataId?: string | null;
}): string {
  return company.id?.trim() || company.wikidataId?.trim() || "";
}
