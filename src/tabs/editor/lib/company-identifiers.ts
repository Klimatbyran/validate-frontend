import type {
  GarboCompanyDetail,
  GarboCompanyIdentifier,
  GarboCompanyIdentifierType,
} from "./types";

export const COMPANY_IDENTIFIER_TYPES = [
  "WIKIDATA",
  "LEI",
  "ORG_NUMBER",
  "ISIN",
] as const satisfies readonly GarboCompanyIdentifierType[];

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

export type EditableCompanyIdentifier = {
  key: string;
  type: GarboCompanyIdentifierType;
  value: string;
  originalValue: string;
  verified: boolean;
  originalVerified: boolean;
  metadata: GarboCompanyIdentifier["metadata"];
  isNew: boolean;
};

function legacyFallbackValue(
  company: GarboCompanyDetail,
  type: GarboCompanyIdentifierType,
): string {
  if (type === "WIKIDATA") return company.wikidataId?.trim() || "";
  if (type === "LEI") return company.lei?.trim() || "";
  return "";
}

export function buildEditableIdentifiers(
  company: GarboCompanyDetail,
): EditableCompanyIdentifier[] {
  const byType = new Map<GarboCompanyIdentifierType, GarboCompanyIdentifier>();
  for (const row of company.identifiers ?? []) {
    byType.set(row.type, row);
  }

  const rows: EditableCompanyIdentifier[] = [];

  for (const type of COMPANY_IDENTIFIER_TYPES) {
    const existing = byType.get(type);
    if (existing) {
      rows.push({
        key: existing.id,
        type,
        value: existing.value,
        originalValue: existing.value,
        verified: isIdentifierVerified(existing),
        originalVerified: isIdentifierVerified(existing),
        metadata: existing.metadata ?? null,
        isNew: false,
      });
      continue;
    }

    const legacyValue = legacyFallbackValue(company, type);
    if (!legacyValue) continue;

    rows.push({
      key: `legacy-${type}`,
      type,
      value: legacyValue,
      originalValue: legacyValue,
      verified: false,
      originalVerified: false,
      metadata: null,
      isNew: false,
    });
  }

  return rows;
}

export function availableIdentifierTypesToAdd(
  existingTypes: Iterable<GarboCompanyIdentifierType>,
): GarboCompanyIdentifierType[] {
  const used = new Set(existingTypes);
  return COMPANY_IDENTIFIER_TYPES.filter((type) => !used.has(type));
}
