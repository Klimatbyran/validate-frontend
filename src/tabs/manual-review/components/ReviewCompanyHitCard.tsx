import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import type { ManualReviewCompanyHit } from "../types";

type Props = {
  hit: ManualReviewCompanyHit;
  busy: boolean;
  onDismissRequest: (hit: ManualReviewCompanyHit) => void;
  onUndo: (hit: ManualReviewCompanyHit) => void;
};

export function ReviewCompanyHitCard({
  hit,
  busy,
  onDismissRequest,
  onUndo,
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dismissed = Boolean(hit.dismissalId);

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            className="text-left text-base font-semibold text-gray-01 hover:text-blue-03"
            onClick={() => navigate(editorCompanyPath(hit.companyId))}
          >
            {hit.name}
          </button>
          <div className="flex flex-wrap gap-2 text-[11px] font-mono text-gray-02">
            {hit.wikidataId ? <span>{hit.wikidataId}</span> : null}
            {hit.lei ? <span>LEI {hit.lei}</span> : null}
            {!hit.wikidataId && !hit.lei ? (
              <span>{t("review.noIdentifiers")}</span>
            ) : null}
          </div>
          {hit.tags.length > 0 ? (
            <p className="text-xs text-gray-02">{hit.tags.join(", ")}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(editorCompanyPath(hit.companyId))}
          >
            {t("review.openEditor")}
          </Button>
          {dismissed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onUndo(hit)}
            >
              {t("review.undoDismiss")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onDismissRequest(hit)}
            >
              {t("review.dismiss")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-01">{hit.evidenceSummary}</p>
      {dismissed ? (
        <div className="space-y-1 rounded-md border border-gray-03/80 bg-gray-04/40 px-3 py-2">
          <p className="text-xs text-gray-02">{t("review.dismissedBadge")}</p>
          {hit.dismissedByName || hit.dismissedAt ? (
            <p className="text-xs text-gray-02">
              {t("review.dismissedBy", {
                name: hit.dismissedByName ?? "—",
                at: hit.dismissedAt
                  ? new Date(hit.dismissedAt).toLocaleString()
                  : "—",
              })}
            </p>
          ) : null}
          {hit.dismissalNote ? (
            <p className="text-sm text-gray-01">
              {t("review.dismissedNote", { note: hit.dismissalNote })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
