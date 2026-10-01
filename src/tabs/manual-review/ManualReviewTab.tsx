import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ReviewDismissDialog } from "./components/ReviewDismissDialog";
import { ReviewDismissedFeedView } from "./components/ReviewDismissedFeedView";
import { ReviewIssueView } from "./components/ReviewIssueView";
import { ReviewSummaryView } from "./components/ReviewSummaryView";
import { useManualReviewDismissals } from "./hooks/useManualReviewDismissals";
import { useManualReviewIssue } from "./hooks/useManualReviewIssue";
import { useManualReviewSummary } from "./hooks/useManualReviewSummary";
import {
  isManualReviewFlagKey,
  type ManualReviewFlagKey,
} from "./lib/flag-catalog";
import type { ManualReviewCompanyHit } from "./types";

type ReviewView = "summary" | "issue" | "dismissed";

export function ManualReviewTab() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissTarget, setDismissTarget] =
    useState<ManualReviewCompanyHit | null>(null);

  const rawView = searchParams.get("view");
  const view: ReviewView =
    rawView === "issue" || rawView === "dismissed" ? rawView : "summary";
  const issueParam = searchParams.get("issue");
  const flagKey = isManualReviewFlagKey(issueParam) ? issueParam : null;
  const dismissedFlagParam = searchParams.get("dismissedFlag");
  const dismissedFlagFilter: ManualReviewFlagKey | "all" =
    isManualReviewFlagKey(dismissedFlagParam) ? dismissedFlagParam : "all";
  const q = searchParams.get("q") ?? "";
  const includeDismissed = searchParams.get("includeDismissed") === "1";

  const summary = useManualReviewSummary();
  const issue = useManualReviewIssue({
    flagKey: view === "issue" ? flagKey : null,
    q,
    includeDismissed,
  });
  const dismissals = useManualReviewDismissals({
    enabled: view === "dismissed",
    q,
    flagKey: dismissedFlagFilter,
  });

  const viewOptions = useMemo(
    () => [
      { value: "summary" as const, label: t("review.views.summary") },
      { value: "issue" as const, label: t("review.views.issue") },
      { value: "dismissed" as const, label: t("review.views.dismissed") },
    ],
    [t],
  );

  function setView(next: ReviewView) {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    if (next === "summary") {
      params.delete("issue");
    }
    setSearchParams(params, { replace: false });
  }

  function openIssue(nextFlag: ManualReviewFlagKey) {
    const params = new URLSearchParams(searchParams);
    params.set("view", "issue");
    params.set("issue", nextFlag);
    setSearchParams(params, { replace: false });
  }

  function setQ(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) params.set("q", value);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  }

  function setIncludeDismissed(value: boolean) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("includeDismissed", "1");
    else params.delete("includeDismissed");
    setSearchParams(params, { replace: true });
  }

  function setDismissedFlagFilter(value: ManualReviewFlagKey | "all") {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("dismissedFlag");
    else params.set("dismissedFlag", value);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-03 bg-gray-04/80 backdrop-blur-sm p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-01">
              {t("review.title")}
            </h1>
            <p className="text-sm text-gray-02 max-w-3xl">
              {t("review.subtitle")}
            </p>
            {summary.data ? (
              <p className="text-xs text-gray-02">
                {t("review.envLine", {
                  env: summary.data.localEnv,
                  at: new Date(summary.data.generatedAt).toLocaleString(),
                })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewModePills
              options={viewOptions}
              value={view}
              onValueChange={(value) => {
                if (value === "issue" && !flagKey) return;
                setView(value);
              }}
              ariaLabel={t("review.viewsAria")}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void summary.refresh();
                void issue.refresh();
                void dismissals.refresh();
              }}
            >
              {t("review.refresh")}
            </Button>
          </div>
        </div>
      </div>

      {view === "dismissed" ? (
        <ReviewDismissedFeedView
          dismissals={dismissals.data?.dismissals ?? []}
          total={dismissals.data?.total ?? 0}
          loading={dismissals.loading}
          error={dismissals.error}
          authRequired={dismissals.authRequired}
          q={q}
          flagKey={dismissedFlagFilter}
          actionBusyId={dismissals.actionBusyId}
          onQChange={setQ}
          onFlagKeyChange={setDismissedFlagFilter}
          onUndo={async (dismissal) => {
            await dismissals.undo(dismissal);
            if (isManualReviewFlagKey(dismissal.flagKey)) {
              summary.adjustFlagCounts(dismissal.flagKey, {
                active: 1,
                dismissed: -1,
              });
            }
          }}
          onOpenIssue={openIssue}
        />
      ) : view === "summary" || !flagKey ? (
        <ReviewSummaryView
          flags={summary.data?.flags ?? []}
          loading={summary.loading}
          error={summary.error}
          authRequired={summary.authRequired}
          onSelectFlag={openIssue}
        />
      ) : (
        <ReviewIssueView
          data={issue.data}
          loading={issue.loading}
          loadingMore={issue.loadingMore}
          hasMore={issue.hasMore}
          error={issue.error}
          authRequired={issue.authRequired}
          q={q}
          includeDismissed={includeDismissed}
          actionBusyId={issue.actionBusyId}
          onBack={() => setView("summary")}
          onQChange={setQ}
          onIncludeDismissedChange={setIncludeDismissed}
          onDismissRequest={setDismissTarget}
          onUndo={async (hit) => {
            await issue.undo(hit);
            if (flagKey) {
              summary.adjustFlagCounts(flagKey, {
                active: 1,
                dismissed: -1,
              });
            }
          }}
          onLoadMore={() => {
            void issue.loadMore();
          }}
        />
      )}

      <ReviewDismissDialog
        hit={dismissTarget}
        open={Boolean(dismissTarget)}
        isLoading={
          dismissTarget != null &&
          issue.actionBusyId ===
            `${dismissTarget.companyId}:${dismissTarget.evidenceFingerprint}`
        }
        onOpenChange={(open) => {
          if (!open) setDismissTarget(null);
        }}
        onConfirm={async (note) => {
          if (!dismissTarget || !flagKey) return;
          await issue.dismiss(dismissTarget, note);
          setDismissTarget(null);
          summary.adjustFlagCounts(flagKey, { active: -1, dismissed: 1 });
        }}
      />
    </div>
  );
}
