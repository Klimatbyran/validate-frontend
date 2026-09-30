import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { ReviewCompanyHitCard } from "./ReviewCompanyHitCard";
import type { ManualReviewCompanyHit, ManualReviewIssuesResponse } from "../types";

type Props = {
  data: ManualReviewIssuesResponse | null;
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  q: string;
  includeDismissed: boolean;
  actionBusyId: string | null;
  onBack: () => void;
  onQChange: (value: string) => void;
  onIncludeDismissedChange: (value: boolean) => void;
  onDismiss: (hit: ManualReviewCompanyHit) => void;
  onUndo: (hit: ManualReviewCompanyHit) => void;
};

export function ReviewIssueView({
  data,
  loading,
  error,
  authRequired,
  q,
  includeDismissed,
  actionBusyId,
  onBack,
  onQChange,
  onIncludeDismissedChange,
  onDismiss,
  onUndo,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            {t("review.backToSummary")}
          </Button>
          <h2 className="text-xl font-semibold text-gray-01">
            {data?.title ?? t("review.issueFallbackTitle")}
          </h2>
          <p className="text-sm text-gray-02">
            {data?.description ?? ""}
          </p>
          {data ? (
            <p className="text-xs text-gray-02">
              {t("review.issueCounts", {
                active: data.activeCount,
                dismissed: data.dismissedCount,
                shown: data.companies.length,
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-03 bg-gray-05/40 p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder={t("review.searchPlaceholder")}
          className="min-w-[14rem] flex-1 rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01"
        />
        <label className="flex items-center gap-2 text-sm text-gray-02">
          <input
            type="checkbox"
            checked={includeDismissed}
            onChange={(e) => onIncludeDismissedChange(e.target.checked)}
          />
          {t("review.showDismissed")}
        </label>
      </div>

      {authRequired ? (
        <Callout variant="warning">{t("review.authRequired")}</Callout>
      ) : null}
      {error ? <Callout variant="error">{error}</Callout> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data && data.companies.length === 0 ? (
        <p className="text-sm text-gray-02 py-8 text-center">
          {t("review.emptyIssue")}
        </p>
      ) : (
        <div className="space-y-3">
          {data?.companies.map((hit) => (
            <ReviewCompanyHitCard
              key={`${hit.companyId}:${hit.evidenceFingerprint}`}
              hit={hit}
              busy={actionBusyId === hit.companyId}
              onDismiss={onDismiss}
              onUndo={onUndo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
