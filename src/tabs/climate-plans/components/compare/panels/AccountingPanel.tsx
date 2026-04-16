import { useI18n } from "@/contexts/I18nContext";
import type { MunicipalityClimatePlan } from "../../../lib/types";
import { Badge, ScopeBadges, YesNoBadge } from "../badges";
import { ACCOUNTING_TYPE_KEYS } from "../../../lib/compare-constants";

export function AccountingPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
    >
      {municipalities.map((m) => {
        const ea = m.emissionTargets?.emissions_accounting;
        const su = m.emissionTargets?.summary;
        if (!ea)
          return (
            <div key={m.id} className="text-gray-02 text-sm">
              {t("climate.compare.noData")}
            </div>
          );

        const accountingInfo = ACCOUNTING_TYPE_KEYS[ea.accounting_type];
        const badgeLabels = accountingInfo
          ? accountingInfo.badgeKeys.map((key) => t(key))
          : [ea.accounting_type?.replace(/_/g, " ") || "—"];

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {/* Accounting type as badges */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.accountingApproach")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {badgeLabels.map((label, i) => (
                  <Badge key={i} variant="blue">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* GHG scopes */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.ghgScopesCovered")}
              </div>
              <ScopeBadges explicit={su?.ghg_scopes_explicit} implicit={su?.ghg_scopes_implicit} />
            </div>

            {/* Boolean checks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">
                  {t("climate.detail.includesConsumptionBased")}
                </span>
                <YesNoBadge value={ea.includes_consumption_based} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">
                  {t("climate.detail.methodologyDescribed")}
                </span>
                <YesNoBadge value={ea.methodology_described} />
              </div>
            </div>

            {/* Methodology reference */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">
                {t("climate.compare.dataSource")}
              </div>
              {ea.methodology_reference ? (
                <Badge>{ea.methodology_reference}</Badge>
              ) : (
                <Badge>{t("climate.compare.notSpecified")}</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

