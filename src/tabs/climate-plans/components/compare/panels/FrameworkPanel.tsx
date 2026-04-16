import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { MunicipalityClimatePlan } from "../../../lib/types";
import { Badge } from "../badges";

export function FrameworkPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  const frameworks = [
    { key: "paris_agreement_mentioned" as const, labelKey: "climate.detail.parisAgreement" },
    { key: "one_point_five_mentioned" as const, labelKey: "climate.detail.onePointFiveTarget" },
    { key: "carbon_budget_referenced" as const, labelKey: "climate.detail.carbonBudget" },
    { key: "swedish_climate_act_referenced" as const, labelKey: "climate.detail.swedishClimateAct" },
    { key: "swedish_national_targets_referenced" as const, labelKey: "climate.compare.swedishNationalTargets" },
    { key: "eu_frameworks_referenced" as const, labelKey: "climate.detail.euFrameworks" },
  ];

  return (
    <div className="space-y-6">
      {/* Framework checklist as badges per municipality */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
      >
        {municipalities.map((m) => (
          <div key={m.id}>
            <div className="text-sm font-medium text-gray-01 mb-3">{m.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map((fw) => {
                const val = m.emissionTargets?.framework_alignment?.[fw.key];
                return (
                  <span
                    key={fw.key}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full",
                      val ? "bg-green-03/20 text-green-03" : "bg-gray-03/30 text-gray-02"
                    )}
                  >
                    {val ? <Check size={12} /> : <X size={12} />}
                    {t(fw.labelKey)}
                  </span>
                );
              })}
            </div>

            {/* EU frameworks named */}
            {m.emissionTargets?.framework_alignment?.eu_frameworks_referenced && (
              <div className="mt-2">
                <div className="text-xs text-gray-02 mb-1">
                  {t("climate.compare.euFrameworksLabel")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.emissionTargets.framework_alignment.eu_frameworks_named?.length > 0 ? (
                    m.emissionTargets.framework_alignment.eu_frameworks_named.map((name, i) => (
                      <Badge key={i} variant="blue">
                        {name}
                      </Badge>
                    ))
                  ) : (
                    <Badge>{t("climate.compare.referencedNotNamed")}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* External references */}
      <div>
        <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-3">
          {t("climate.compare.externalReferences")}
        </div>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
        >
          {municipalities.map((m) => {
            const refs = m.emissionTargets?.external_references;
            return (
              <div key={m.id} className="space-y-2">
                {refs && refs.length > 0 ? (
                  refs.map((r, i) => (
                    <div key={i} className="bg-gray-03/30 rounded-lg p-3">
                      <div className="text-sm text-gray-01 mb-1.5">{r.reference_description}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge>{r.source_organization}</Badge>
                        <Badge variant="blue">{r.target_value}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">
                    {t("climate.compare.none")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

