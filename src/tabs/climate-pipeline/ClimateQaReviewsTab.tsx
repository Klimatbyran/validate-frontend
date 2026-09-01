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
import { useClimatePipelinePlans } from "@/tabs/climate-pipeline/hooks/useClimatePipelinePlans";
import { ReviewingAsField } from "@/tabs/climate-pipeline/components/ReviewingAsField";

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

function formatJsonCompact(value: unknown): string {
  try {
    const text = JSON.stringify(value);
    if (!text || text === "null" || text === "undefined") return "—";
    return text;
  } catch {
    return "—";
  }
}

function formatJsonPretty(value: unknown): string {
  try {
    if (value === null || value === undefined) return "—";
    return JSON.stringify(value, null, 2);
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

/** Keeps long text inside the column; expands in-row on hover. */
function WrappingCell({
  children,
  title,
  className = "",
}: {
  children: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`break-words whitespace-pre-wrap line-clamp-2 hover:line-clamp-none ${className}`}
      title={title ?? children}
    >
      {children}
    </div>
  );
}

/** Compact preview; click to toggle pretty-printed JSON in-row. */
function JsonPreviewCell({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const compact = formatJsonCompact(value);
  const pretty = formatJsonPretty(value);
  const isEmpty = compact === "—";

  if (isEmpty) {
    return <span className="text-gray-02">—</span>;
  }

  return (
    <button
      type="button"
      className="w-full text-left text-xs text-gray-02 font-mono hover:text-gray-01 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-03 rounded-sm"
      onClick={() => setExpanded((open) => !open)}
      title={expanded ? "Click to collapse" : "Click to expand (pretty JSON)"}
      aria-expanded={expanded}
    >
      <pre
        className={`m-0 whitespace-pre-wrap break-all ${
          expanded ? "max-h-80 overflow-auto" : "line-clamp-2"
        }`}
      >
        {expanded ? pretty : compact}
      </pre>
      <span className="mt-0.5 block text-[10px] font-sans text-blue-03">
        {expanded ? "Collapse" : "Expand"}
      </span>
    </button>
  );
}

export function ClimateQaReviewsTab() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ReviewStatus | "">("ISSUE");
  const [step, setStep] = useState("");
  const [planId, setPlanId] = useState("");
  const filters = useMemo(
    () => ({ status, step, planId }),
    [status, step, planId],
  );
  const { reviews, total, isLoading, error, refresh } =
    usePipelineReviewsBoard(filters);
  const { plans } = useClimatePipelinePlans();

  const planOptions = useMemo(
    () =>
      [...plans]
        .map((plan) => ({ id: plan.id, label: planLabel(plan) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [plans],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportJson = () => {
    const truncated = reviews.length < total;
    const payload = {
      total,
      exportedCount: reviews.length,
      truncated,
      filters: { status, step, planId },
      reviews,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `climate-plan-qa-reviews-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    if (truncated) {
      window.alert(
        `Export includes ${reviews.length} of ${total} reviews (board limit). Narrow filters to export a complete set.`,
      );
    }
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
          {t("climateQaReviews.filterPlan")}
          <select
            className="h-9 max-w-[16rem] rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">{t("climateQaReviews.planAll")}</option>
            {planOptions.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.label}
              </option>
            ))}
          </select>
        </label>
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
        <ReviewingAsField />
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
          <DataTable className="table-fixed w-full min-w-[64rem]">
            <DataTableHead>
              <tr>
                <th className="px-3 py-2 w-[12%]">
                  {t("climateQaReviews.colPlan")}
                </th>
                <th className="px-3 py-2 w-[12%]">
                  {t("climateQaReviews.colStep")}
                </th>
                <th className="px-3 py-2 w-[8%]">
                  {t("climateQaReviews.colStatus")}
                </th>
                <th className="px-3 py-2 w-[16%]">
                  {t("climateQaReviews.colSnapshot")}
                </th>
                <th className="px-3 py-2 w-[16%]">
                  {t("climateQaReviews.colSuggestion")}
                </th>
                <th className="px-3 py-2 w-[14%]">
                  {t("climateQaReviews.colComment")}
                </th>
                <th className="px-3 py-2 w-[10%]">
                  {t("climateQaReviews.colReviewedBy")}
                </th>
                <th className="px-3 py-2 w-[12%]">
                  {t("climateQaReviews.colWhen")}
                </th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {reviews.map((review) => {
                const commentText = review.comment ?? "—";
                return (
                  <tr key={review.id}>
                    <td className="px-3 py-2 text-sm align-top overflow-hidden">
                      <Link
                        className="text-blue-03 hover:underline break-words"
                        to={`/climate-pipeline?planId=${encodeURIComponent(review.plan.id)}&step=${encodeURIComponent(review.step)}`}
                      >
                        {planLabel(review.plan)}
                      </Link>
                      <div className="text-[10px] text-gray-02 font-mono mt-0.5 break-all">
                        {review.entityType}/{review.entityId.slice(0, 12)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-02 align-top overflow-hidden">
                      <WrappingCell>{review.step}</WrappingCell>
                    </td>
                    <td className="px-3 py-2 text-xs align-top whitespace-nowrap">
                      {review.status}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-02 font-mono align-top overflow-hidden">
                      <JsonPreviewCell value={review.reviewedSnapshot} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-02 font-mono align-top overflow-hidden">
                      <JsonPreviewCell value={review.suggestedValue} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-01 align-top overflow-hidden">
                      <WrappingCell>{commentText}</WrappingCell>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-01 align-top overflow-hidden">
                      <WrappingCell>
                        {review.reviewedBy?.trim() || "—"}
                      </WrappingCell>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-02 align-top whitespace-nowrap">
                      {new Date(review.reviewedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
