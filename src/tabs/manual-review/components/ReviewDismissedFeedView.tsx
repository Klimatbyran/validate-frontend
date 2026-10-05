import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import {
  MANUAL_REVIEW_FLAG_KEYS,
  type ManualReviewFlagKey,
} from "../lib/flag-catalog";
import type { ManualReviewDismissal } from "../types";

type Props = {
  dismissals: ManualReviewDismissal[];
  total: number;
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  q: string;
  flagKey: ManualReviewFlagKey | "all";
  actionBusyId: string | null;
  onQChange: (value: string) => void;
  onFlagKeyChange: (value: ManualReviewFlagKey | "all") => void;
  onUndo: (dismissal: ManualReviewDismissal) => void;
  onOpenIssue: (flagKey: ManualReviewFlagKey) => void;
};

export function ReviewDismissedFeedView({
  dismissals,
  total,
  loading,
  error,
  authRequired,
  q,
  flagKey,
  actionBusyId,
  onQChange,
  onFlagKeyChange,
  onUndo,
  onOpenIssue,
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-01">
          {t("review.dismissedFeedTitle")}
        </h2>
        <p className="text-sm text-gray-02">
          {t("review.dismissedFeedSubtitle")}
        </p>
        <p className="text-xs text-gray-02">
          {t("review.dismissedFeedCounts", {
            shown: dismissals.length,
            total,
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-03 bg-gray-05/40 p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder={t("review.searchPlaceholder")}
          className="min-w-[14rem] flex-1 rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01"
        />
        <select
          value={flagKey}
          onChange={(e) =>
            onFlagKeyChange(
              e.target.value === "all"
                ? "all"
                : (e.target.value as ManualReviewFlagKey),
            )
          }
          className="rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01"
        >
          <option value="all">{t("review.filterAllFlags")}</option>
          {MANUAL_REVIEW_FLAG_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      {authRequired ? (
        <Callout variant="warning">{t("review.authRequired")}</Callout>
      ) : null}
      {error ? <Callout variant="error">{error}</Callout> : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : dismissals.length === 0 ? (
        <p className="text-sm text-gray-02 py-8 text-center">
          {t("review.dismissedFeedEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {dismissals.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-gray-03 bg-gray-05/50 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <button
                    type="button"
                    className="text-left text-base font-semibold text-gray-01 hover:text-blue-03"
                    onClick={() => navigate(editorCompanyPath(row.companyId))}
                  >
                    {row.companyName}
                  </button>
                  <p className="text-xs text-gray-02">
                    {row.flagTitle}{" "}
                    <span className="font-mono">({row.flagKey})</span>
                  </p>
                  <p className="text-xs text-gray-02">
                    {t("review.dismissedBy", {
                      name: row.userName,
                      at: new Date(row.createdAt).toLocaleString(),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(editorCompanyPath(row.companyId))}
                  >
                    {t("review.openEditor")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onOpenIssue(row.flagKey as ManualReviewFlagKey)
                    }
                  >
                    {t("review.openIssue")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusyId === row.id}
                    onClick={() => onUndo(row)}
                  >
                    {t("review.undoDismiss")}
                  </Button>
                </div>
              </div>
              {row.note ? (
                <p className="text-sm text-gray-01">
                  {t("review.dismissedNote", { note: row.note })}
                </p>
              ) : null}
              <p className="text-[11px] font-mono text-gray-02 break-all">
                {row.evidenceFingerprint}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
