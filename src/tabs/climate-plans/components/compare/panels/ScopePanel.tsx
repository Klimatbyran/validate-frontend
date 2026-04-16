import { useI18n } from "@/contexts/I18nContext";
import type { MunicipalityClimatePlan } from "../../../lib/types";
import { Badge, YesNoBadge } from "../badges";
import { scopeTKey } from "../shared";
import { FOCUS_KEYS } from "../../../lib/compare-constants";

export function ScopePanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
    >
      {municipalities.map((m) => {
        const pd = m.planScope?.policy_domain;
        const ss = m.planScope?.spatial_scope;
        if (!pd && !ss)
          return (
            <div key={m.id} className="text-gray-02 text-sm">
              {t("climate.compare.noData")}
            </div>
          );
        const focus = FOCUS_KEYS[pd?.primary_focus || ""];
        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.focus")}</span>
                {focus ? (
                  <div className="flex flex-wrap gap-1.5">
                    {focus.badges.map((b, i) => (
                      <Badge key={i} variant={b.variant}>
                        {t(b.labelKey)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge>{pd?.primary_focus?.replace(/_/g, " ") || "—"}</Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.spatialScope")}</span>
                <Badge variant="blue">
                  {scopeTKey[ss?.primary_scope || ""]
                    ? t(scopeTKey[ss?.primary_scope || ""])
                    : ss?.primary_scope?.replace(/_/g, " ") || "—"}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">
                  {t("climate.compare.operationsVsTerritory")}
                </span>
                <YesNoBadge value={ss?.distinguishes_operations_vs_territory || false} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.regionalAlignment")}</span>
                <YesNoBadge value={ss?.addresses_metropolitan_or_regional || false} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

