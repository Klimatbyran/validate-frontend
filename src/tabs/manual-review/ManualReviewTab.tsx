import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ReviewIssueView } from "./components/ReviewIssueView";
import { ReviewSummaryView } from "./components/ReviewSummaryView";
import { useManualReviewIssue } from "./hooks/useManualReviewIssue";
import { useManualReviewSummary } from "./hooks/useManualReviewSummary";
import {
  isManualReviewFlagKey,
  type ManualReviewFlagKey,
} from "./lib/flag-catalog";

type ReviewView = "summary" | "issue";

export function ManualReviewTab() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: ReviewView =
    searchParams.get("view") === "issue" ? "issue" : "summary";
  const issueParam = searchParams.get("issue");
  const flagKey = isManualReviewFlagKey(issueParam) ? issueParam : null;
  const q = searchParams.get("q") ?? "";
  const includeDismissed = searchParams.get("includeDismissed") === "1";

  const summary = useManualReviewSummary();
  const issue = useManualReviewIssue({
    flagKey: view === "issue" ? flagKey : null,
    q,
    includeDismissed,
  });

  const viewOptions = useMemo(
    () => [
      { value: "summary" as const, label: t("review.views.summary") },
      { value: "issue" as const, label: t("review.views.issue") },
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
              }}
            >
              {t("review.refresh")}
            </Button>
          </div>
        </div>
      </div>

      {view === "summary" || !flagKey ? (
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
          error={issue.error}
          authRequired={issue.authRequired}
          q={q}
          includeDismissed={includeDismissed}
          actionBusyId={issue.actionBusyId}
          onBack={() => setView("summary")}
          onQChange={setQ}
          onIncludeDismissedChange={setIncludeDismissed}
          onDismiss={issue.dismiss}
          onUndo={issue.undo}
        />
      )}
    </div>
  );
}
