import { CheckCircle2, HelpCircle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { GarboCompanyIdentifier } from "../../lib/types";
import { isIdentifierVerified } from "../../lib/company-identifiers";

export function CompanyIdentifierVerificationBadge({
  identifier,
}: {
  identifier: GarboCompanyIdentifier;
}) {
  const { t } = useI18n();
  const verified = isIdentifierVerified(identifier);
  const verifierName = identifier.metadata?.verifiedBy?.name?.trim();

  if (verified) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-green-03"
        title={
          verifierName
            ? t("editor.companyDetail.verifiedBy", { name: verifierName })
            : undefined
        }
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {t("editor.companyDetail.verified")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-03">
      <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
      {t("editor.companyDetail.unverified")}
    </span>
  );
}
