import { useI18n } from "@/contexts/I18nContext";
import type { GarboCompanyIdentifier } from "../../lib/types";
import { CompanyIdentifierVerificationBadge } from "./CompanyIdentifierVerificationBadge";

const IDENTIFIER_TYPE_KEYS = {
  WIKIDATA: "wikidata",
  LEI: "lei",
  ORG_NUMBER: "orgNumber",
  ISIN: "isin",
} as const satisfies Record<GarboCompanyIdentifier["type"], string>;

export function CompanyIdentifiersList({
  identifiers,
}: {
  identifiers: GarboCompanyIdentifier[];
}) {
  const { t } = useI18n();

  if (identifiers.length === 0) return null;

  return (
    <ul className="space-y-2">
      {identifiers.map((identifier) => {
        const typeKey = IDENTIFIER_TYPE_KEYS[identifier.type];
        return (
          <li
            key={identifier.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-05/80 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
                {t(`editor.companyDetail.identifierType.${typeKey}`)}
              </div>
              <code className="text-sm font-mono text-gray-01 break-all">
                {identifier.value}
              </code>
            </div>
            <CompanyIdentifierVerificationBadge identifier={identifier} />
          </li>
        );
      })}
    </ul>
  );
}
