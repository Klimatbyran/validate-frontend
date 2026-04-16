import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import type { MunicipalityClimatePlan } from "../../../lib/types";
import { Badge } from "../badges";
import { GoalCard } from "../GoalCard";
import { scopeTKey } from "../shared";
import { CONFIDENCE_STYLES } from "../../../lib/compare-constants";

export function TargetsPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
    >
      {municipalities.map((m) => {
        const et = m.emissionTargets;
        if (!et)
          return (
            <div key={m.id} className="text-gray-02 text-sm">
              {t("climate.compare.noData")}
            </div>
          );

        const reductionGoals = et.own_commitments.filter((c) => c.goal_type === "emission_reduction");
        const implementationGoals = et.own_commitments.filter((c) => c.goal_type === "implementation");

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {et.primary_target?.exists ? (
              <Callout variant="success" title={t("climate.compare.primaryTarget")}>
                <div className="text-xl font-bold text-gray-01 mb-2">
                  {et.primary_target.reduction_percentage
                    ? `${et.primary_target.reduction_percentage}% by ${et.primary_target.target_year}`
                    : `by ${et.primary_target.target_year}`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>
                    {scopeTKey[et.primary_target.scope || ""]
                      ? t(scopeTKey[et.primary_target.scope || ""])
                      : et.primary_target.scope?.replace(/_/g, " ")}
                  </Badge>
                  {et.primary_target.baseline_year && (
                    <Badge>
                      {t("climate.detail.baseline")}: {et.primary_target.baseline_year}
                    </Badge>
                  )}
                  {et.primary_target.confidence && (
                    <Badge variant={CONFIDENCE_STYLES[et.primary_target.confidence]?.variant || "default"}>
                      {et.primary_target.confidence} {t("climate.compare.confidence")}
                    </Badge>
                  )}
                </div>
              </Callout>
            ) : (
              <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-4 flex flex-col justify-center min-h-[100px]">
                <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                  {t("climate.compare.primaryTarget")}
                </div>
                <div className="text-lg text-gray-02">{t("climate.compare.none")}</div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.reductionGoals")}
                <Badge variant={reductionGoals.length > 0 ? "blue" : "default"}>{reductionGoals.length}</Badge>
              </div>
              {reductionGoals.length > 0 ? (
                reductionGoals.map((c, i) => <GoalCard key={i} c={c} />)
              ) : (
                <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">
                  {t("climate.compare.none")}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.implementationGoals")}
                <Badge variant={implementationGoals.length > 0 ? "orange" : "default"}>{implementationGoals.length}</Badge>
              </div>
              {implementationGoals.length > 0 ? (
                implementationGoals.map((c, i) => <GoalCard key={i} c={c} />)
              ) : (
                <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">
                  {t("climate.compare.none")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

