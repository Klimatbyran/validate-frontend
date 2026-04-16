import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import type { MunicipalityClimatePlan } from "../../lib/types";
import { Badge } from "./badges";
import { scopeTKey } from "./shared";

export function MunicipalitySummaryCard({
  m,
  onClick,
}: {
  m: MunicipalityClimatePlan;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const et = m.emissionTargets;
  const ps = m.planScope;
  const pt = et?.primary_target;
  const reductionGoals =
    et?.own_commitments?.filter((c) => c.goal_type === "emission_reduction" && c.reduction_percentage) ||
    [];
  const biggestReduction =
    reductionGoals.length > 0
      ? reductionGoals.reduce((max, c) =>
          Number(c.reduction_percentage) > Number(max.reduction_percentage) ? c : max
        )
      : null;

  const frameworkFlags = [
    { val: et?.framework_alignment?.paris_agreement_mentioned, labelKey: "climate.compare.frameworkShortParis" },
    { val: et?.framework_alignment?.one_point_five_mentioned, labelKey: "climate.compare.frameworkShort1_5" },
    { val: et?.framework_alignment?.carbon_budget_referenced, labelKey: "climate.compare.frameworkShortCarbonBudget" },
    { val: et?.framework_alignment?.swedish_climate_act_referenced, labelKey: "climate.compare.frameworkShortSwedishClimateAct" },
    { val: et?.framework_alignment?.eu_frameworks_referenced, labelKey: "climate.compare.frameworkShortEu" },
  ];

  return (
    <button
      onClick={onClick}
      className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-5 text-left hover:bg-gray-03/50 transition-colors flex-1 min-w-[280px]"
    >
      <div className="text-lg font-semibold text-gray-01 mb-3">{m.name}</div>

      {/* Primary target — always shown for symmetry */}
      {pt?.exists ? (
        <Callout variant="success" title={t("climate.compare.primaryTarget")} className="mb-3">
          <div className="text-2xl font-bold text-gray-01">{pt.target_year || "—"}</div>
          <Badge variant="default">
            {pt.scope &&
              ((scopeTKey[pt.scope] ? t(scopeTKey[pt.scope]) : pt.scope.replace(/_/g, " ")) || "—")}
          </Badge>
        </Callout>
      ) : (
        <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-3 mb-3 flex flex-col justify-center min-h-[88px]">
          <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">
            {t("climate.compare.primaryTarget")}
          </div>
          <div className="text-lg text-gray-02">{t("climate.compare.none")}</div>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-03">
            {biggestReduction ? `${biggestReduction.reduction_percentage}%` : "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.maxReduction")}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-01">
            {ps?.temporal_scope?.plan_period_start || "—"}–{ps?.temporal_scope?.plan_period_end?.slice(-2) || "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.planPeriod")}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-03">{et?.own_commitments?.length || 0}</div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.goals")}</div>
        </div>
      </div>

      {/* Framework badges */}
      <div className="flex flex-wrap gap-1 mt-3">
        {frameworkFlags.map((fw) => (
          <span
            key={fw.labelKey}
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              fw.val ? "bg-green-03/15 text-green-03" : "bg-gray-03/30 text-gray-02"
            )}
          >
            {t(fw.labelKey)}
          </span>
        ))}
      </div>

      <div className="text-xs text-blue-03 mt-4">{t("climate.compare.viewFullDetails")}</div>
    </button>
  );
}

