import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { AutoSearchCompanyDetail } from "../lib/crawler-types";

function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

function CompanyLlmDetail({ detail }: { detail: AutoSearchCompanyDetail }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(
    detail.outcome === "low_confidence" || detail.candidates.length > 1,
  );

  if (detail.candidates.length === 0) return null;

  const outcomeLabel =
    detail.outcome === "added"
      ? t("crawler.autoSearchOutcomeAdded")
      : detail.outcome === "selected"
        ? t("crawler.autoSearchOutcomeSelected")
        : detail.outcome === "already_in_registry"
          ? t("crawler.autoSearchOutcomeAlreadyInRegistry")
          : detail.outcome === "low_confidence"
            ? t("crawler.autoSearchOutcomeLowConfidence")
            : detail.outcome === "analyze_failed"
              ? t("crawler.autoSearchOutcomeAnalyzeFailed")
              : detail.outcome === "failed"
                ? t("crawler.failed")
                : t("crawler.autoSearchOutcomeNoResults");

  const confidencePct = detail.llm
    ? Math.round(detail.llm.confidence * 100)
    : null;

  return (
    <div className="border border-gray-03/40 rounded-md overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm bg-gray-04/30 hover:bg-gray-04/50"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-gray-02" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-gray-02" />
        )}
        <span className="font-medium text-gray-01">{detail.companyName}</span>
        <span className="text-xs text-gray-02">({outcomeLabel})</span>
        {detail.discoverySource && (
          <span className="text-xs text-blue-03">
            {detail.discoverySource === "company_site"
              ? t("crawler.autoSearchDiscoveryCompanySite")
              : t("crawler.autoSearchDiscoveryWebSearch")}
          </span>
        )}
        {confidencePct != null && (
          <span className="text-xs text-purple-400">
            {t("crawler.autoSearchLlmTag", { confidence: confidencePct })}
          </span>
        )}
      </button>
      {open && (
        <ul className="divide-y divide-gray-03/30">
          {detail.prefilter?.reasoning && (
            <li className="px-3 py-2 text-xs text-gray-02 bg-gray-04/40">
              <span className="text-gray-01 font-medium">
                {t("crawler.autoSearchPrefilterReasoning")}
              </span>{" "}
              {detail.prefilter.reasoning}
            </li>
          )}
          {detail.llm?.reasoning && (
            <li className="px-3 py-2 text-xs text-gray-02 bg-purple-500/5">
              <span className="text-purple-400 font-medium">
                {t("crawler.autoSearchLlmReasoning")}
              </span>{" "}
              {detail.llm.reasoning}
              {detail.llm.detectedYear && (
                <span className="text-gray-02/80">
                  {" "}
                  ({t("crawler.autoSearchLlmDetectedYear", {
                    year: detail.llm.detectedYear,
                  })})
                </span>
              )}
            </li>
          )}
          {detail.candidates.map((c) => (
            <li
              key={c.url}
              className={`px-3 py-2 text-xs space-y-1 ${
                c.isWinner ? "bg-orange-04/20" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-03 underline break-all"
                  title={c.url}
                >
                  {truncateUrl(c.url)}
                </a>
                {c.isWinner && (
                  <span className="text-orange-03 font-medium">
                    {t("crawler.autoSearchLlmSelected")}
                  </span>
                )}
                {c.isLlmChoice && !c.isWinner && (
                  <span className="text-purple-400 font-medium">
                    {t("crawler.autoSearchLlmSuggested")}
                  </span>
                )}
                {c.prefilterSkipped ? (
                  <span className="text-gray-02/80">
                    {t("crawler.autoSearchPrefilterSkipped")}
                  </span>
                ) : (
                  <span className="text-gray-02/80">
                    {t("crawler.autoSearchPagesRead", { count: c.pagesRead })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AutoSearchLlmBreakdown({
  details,
}: {
  details: AutoSearchCompanyDetail[];
}) {
  const { t } = useI18n();
  const withCandidates = details.filter((d) => d.candidates.length > 0);
  if (withCandidates.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium text-gray-01 mb-2">
        {t("crawler.autoSearchLlmBreakdownTitle")}
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {withCandidates.map((detail) => (
          <CompanyLlmDetail key={detail.companyName} detail={detail} />
        ))}
      </div>
    </div>
  );
}
