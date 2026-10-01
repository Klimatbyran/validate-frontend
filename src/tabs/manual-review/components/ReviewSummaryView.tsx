import { useI18n } from "@/contexts/I18nContext";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { Callout } from "@/ui/callout";
import {
  FLAG_GROUP_ORDER,
  FLAG_MATURITY,
  type ManualReviewFlagKey,
} from "../lib/flag-catalog";
import type { ManualReviewSummaryFlag } from "../types";

type Props = {
  flags: ManualReviewSummaryFlag[];
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  onSelectFlag: (flagKey: ManualReviewFlagKey) => void;
};

const GROUP_LABEL_KEYS: Record<string, string> = {
  completeness: "review.groups.completeness",
  temporal: "review.groups.temporal",
  anomalies: "review.groups.anomalies",
  identity: "review.groups.identity",
  extraction: "review.groups.extraction",
};

function flagMaturity(
  flag: ManualReviewSummaryFlag,
): "stable" | "experimental" {
  if (flag.maturity === "stable" || flag.maturity === "experimental") {
    return flag.maturity;
  }
  return FLAG_MATURITY[flag.flagKey] ?? "stable";
}

export function ReviewSummaryView({
  flags,
  loading,
  error,
  authRequired,
  onSelectFlag,
}: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (authRequired) {
    return <Callout variant="warning">{t("review.authRequired")}</Callout>;
  }

  if (error) {
    return <Callout variant="error">{error}</Callout>;
  }

  return (
    <div className="space-y-8">
      {FLAG_GROUP_ORDER.map((group) => {
        const groupFlags = flags.filter((f) => f.group === group);
        if (groupFlags.length === 0) return null;
        return (
          <section key={group} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-02">
              {t(GROUP_LABEL_KEYS[group] ?? group)}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groupFlags.map((flag) => {
                const maturity = flagMaturity(flag);
                return (
                  <button
                    key={flag.flagKey}
                    type="button"
                    onClick={() => onSelectFlag(flag.flagKey)}
                    className="rounded-lg border border-gray-03 bg-gray-05/70 p-4 text-left transition hover:border-blue-03/40 hover:bg-gray-04/80"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-01">
                        {flag.title}
                      </h4>
                      <span className="text-lg font-semibold text-blue-03">
                        {flag.activeCount}
                      </span>
                    </div>
                    {maturity === "experimental" ? (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-400">
                        {t("review.experimentalBadge")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-gray-02">
                      {flag.description}
                    </p>
                    {flag.dismissedCount > 0 ? (
                      <p className="mt-2 text-[11px] text-gray-02">
                        {t("review.dismissedCount", {
                          count: flag.dismissedCount,
                        })}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
