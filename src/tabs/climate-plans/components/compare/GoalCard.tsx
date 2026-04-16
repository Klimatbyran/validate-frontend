import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "./badges";
import type { OwnCommitment } from "../../lib/types";
import { STRENGTH_KEYS } from "../../lib/compare-constants";
import { scopeTKey } from "./shared";

export function GoalCard({ c }: { c: OwnCommitment }) {
  const { t } = useI18n();
  const hasReduction = c.reduction_percentage && c.reduction_percentage !== "";
  const hasAbsolute = c.absolute_target && c.absolute_target !== "";
  const strength = STRENGTH_KEYS[c.commitment_strength];

  return (
    <div className="bg-gray-03/30 rounded-lg p-3 mb-2">
      <div className="text-sm text-gray-01 mb-2">{c.goal_description}</div>
      <div className="flex flex-wrap gap-1.5">
        {hasReduction && <Badge variant="blue">{c.reduction_percentage}%</Badge>}
        {hasAbsolute && <Badge variant="blue">{c.absolute_target}</Badge>}
        {c.target_year && (
          <Badge>
            {t("climate.detail.target")}: {c.target_year}
          </Badge>
        )}
        {c.baseline_year && (
          <Badge>
            {t("climate.detail.baseline")}: {c.baseline_year}
          </Badge>
        )}
        {c.sector && <Badge variant="orange">{c.sector}</Badge>}
        {c.ghg_scopes_explicit?.length > 0 && (
          <Badge>
            {t("climate.compare.scopeNumber", { n: c.ghg_scopes_explicit.join("+") })}
          </Badge>
        )}
        {c.ghg_scopes_implicit?.length > 0 && (
          <Badge>
            {t("climate.compare.scopeNumber", { n: c.ghg_scopes_implicit.join("+") })}{" "}
            {t("climate.compare.implicit")}
          </Badge>
        )}
        {strength && <Badge variant={strength.variant}>{t(strength.labelKey)}</Badge>}
        {c.scope && (
          <Badge>
            {scopeTKey[c.scope] ? t(scopeTKey[c.scope]) : c.scope.replace(/_/g, " ")}
          </Badge>
        )}
      </div>
    </div>
  );
}

