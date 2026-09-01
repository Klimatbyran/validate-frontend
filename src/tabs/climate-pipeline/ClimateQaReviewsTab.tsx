import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/ui/button";
import {
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableBody,
} from "@/ui/data-table";
import { useI18n } from "@/contexts/I18nContext";
import {
  usePipelineReviewsBoard,
  type ReviewStatus,
} from "@/tabs/climate-pipeline/hooks/usePipelineReviews";

const PIPELINE_STEPS = [
  "extractMunicipality",
  "extractCommitments",
  "filterCommitmentsClimate",
  "filterCommitmentsActionable",
  "groupCommitmentsSimilar",
  "groupCommitmentsThemes",
  "extractMeasures",
  "scoreMeasures",
  "matchTransitionElements",
] as const;

function previewJson(value: unknown, max = 120): string {
  try {
    const text = JSON.stringify(value);
    if (!text) return "—";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return "—";
  }
}

function planLabel(plan: {
  extractedMunicipalityName: string | null;
  municipality: { name: string } | null;
  url: string;
}): string {
  return (
    plan.municipality?.name ??
    plan.extractedMunicipalityName ??
    plan.url.replace(/^https?:\/\//, "").slice(0, 40)
  );
}

export function ClimateQaReviewsTab() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ReviewStatus | "">("ISSUE");
  const [step, setStep] = useState("");
  const filters = useMemo(
    () => ({ status, step, planId: "" }),
    [status, step],
  );
  const { reviews, total, isLoading, error, refresh } =
    usePipelineReviewsBoard(filters);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ total, reviews }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `climate-plan-qa-reviews-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("climateQaReviews.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1 max-w-2xl">
            {t("climateQaReviews.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            aria-label={t("climateQaReviews.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportJson}
            disabled={reviews.length === 0}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {t("climateQaReviews.export")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-02 flex items-center gap-2">
          {t("climateQaReviews.filterStatus")}
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReviewStatus | "")}
          >
            <option value="">{t("climateQaReviews.statusAll")}</option>
            <option value="OK">OK</option>
            <option value="ISSUE">ISSUE</option>
            <option value="SUGGESTED_FIX">SUGGESTED_FIX</option>
          </select>
        </label>
        <label className="text-xs text-gray-02 flex items-center gap-2">
          {t("climateQaReviews.filterStep")}
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          >
            <option value="">{t("climateQaReviews.stepAll")}</option>
            {PIPELINE_STEPS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-gray-02">
          {t("climateQaReviews.count", { count: total })}
        </span>
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      )}
      {error && (
        <p className="text-sm text-pink-03">
          {t("climateQaReviews.error", { error })}
        </p>
      )}
      {!isLoading && !error && reviews.length === 0 && (
        <p className="text-sm text-gray-02">{t("climateQaReviews.empty")}</p>
      )}
      {!isLoading && reviews.length > 0 && (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-3 py-2">{t("climateQaReviews.colPlan")}</th>
                <th className="px-3 py-2">{t("climateQaReviews.colStep")}</th>
                <th className="px-3 py-2">{t("climateQaReviews.colStatus")}</th>
                <th className="px-3 py-2">{t("climateQaReviews.colSnapshot")}</th>
                <th className="px-3 py-2">
                  {t("climateQaReviews.colSuggestion")}
                </th>
                <th className="px-3 py-2">{t("climateQaReviews.colComment")}</th>
                <th className="px-3 py-2">{t("climateQaReviews.colWhen")}</th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td className="px-3 py-2 text-sm">
                    <Link
                      className="text-blue-03 hover:underline"
                      to={`/climate-pipeline?planId=${review.plan.id}&step=${review.step}`}
                    >
                      {planLabel(review.plan)}
                    </Link>
                    <div className="text-[10px] text-gray-02 font-mono mt-0.5">
                      {review.entityType}/{review.entityId.slice(0, 12)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-02">
                    {review.step}
                  </td>
                  <td className="px-3 py-2 text-xs">{review.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-02 font-mono max-w-xs">
                    {previewJson(review.reviewedSnapshot)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02 font-mono max-w-xs">
                    {previewJson(review.suggestedValue)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-01 max-w-xs whitespace-pre-wrap">
                    {review.comment ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02 whitespace-nowrap">
                    {new Date(review.reviewedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
