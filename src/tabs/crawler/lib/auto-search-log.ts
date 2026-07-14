import type { AutoSearchCompanyDetail, AutoSearchStats } from "./crawler-types";

/** Outcomes that mean "the requested report was NOT saved" — these are logged. */
const NOT_FOUND_OUTCOMES: ReadonlySet<AutoSearchCompanyDetail["outcome"]> =
  new Set([
    "no_results",
    "analyze_failed",
    "llm_failed",
    "low_confidence",
    "failed",
  ]);

export type AutoSearchLogEntry = {
  companyName: string;
  reportYear: string;
  outcome: AutoSearchCompanyDetail["outcome"];
  /** Short, deterministic explanation of the failure stage. */
  reason: string;
  /** The AI's own words when the selection step actually ran. */
  aiExplanation?: string;
  aiConfidencePct?: number;
  aiDetectedYear?: string | null;
  discoverySource?: string;
  /** Save error message when the report was picked but saving failed. */
  saveError?: string;
  candidatesConsidered: {
    url: string;
    pagesRead: number;
    prefilterSkipped: boolean;
    wasAiChoice: boolean;
  }[];
};

export type AutoSearchLog = {
  generatedAt: string;
  reportYear: string;
  summary: {
    companiesRequested: number;
    added: number;
    notFound: number;
  };
  entries: AutoSearchLogEntry[];
};

/**
 * Human-readable reason for why a company's report was not saved. Describes the
 * pipeline stage that failed so a developer can problem-solve from the log
 * alone. The AI's verbatim reasoning (when it ran) is carried separately in
 * `aiExplanation`.
 */
function reasonForOutcome(
  outcome: AutoSearchCompanyDetail["outcome"],
  detail: AutoSearchCompanyDetail,
): string {
  switch (outcome) {
    case "no_results":
      return "No candidate report URLs were discovered. Web search (and the Firecrawl fallback) returned nothing to analyze, so the AI selection stage never ran. Likely causes: the company website/report was not found by search, an unusual company/brand name, or the report is not published as a crawlable PDF.";
    case "analyze_failed":
      return "Candidate URLs were found, but page-1 PDF cover text could not be extracted from any of them (unreadable, too large, timed out, or the URL served HTML rather than a PDF). The AI could not evaluate the candidates.";
    case "llm_failed":
      return "PDF cover text was extracted, but the AI selection request itself failed (API error or timeout during the run). Re-running usually succeeds.";
    case "low_confidence":
      return `The AI reviewed the candidates but was not confident enough${
        detail.llm ? ` (${Math.round(detail.llm.confidence * 100)}%)` : ""
      } to select a report for the requested year. This usually means the correct year/company was not clearly present in the candidates, or an adjacent-year report was the closest match.`;
    case "failed":
      return "A report was selected but saving it to the Registry failed.";
    default:
      return "Report was not saved.";
  }
}

/**
 * Builds a copy-pasteable diagnostic log of every requested company whose report
 * was not saved, including the AI's own explanation where the selection step
 * ran. Intended to be copied as JSON and handed to a developer (or Cursor) to
 * problem-solve discovery/selection gaps.
 */
export function buildAutoSearchLog(
  stats: AutoSearchStats,
  reportYear: string,
): AutoSearchLog {
  const entries: AutoSearchLogEntry[] = [];

  for (const detail of stats.companyDetails) {
    if (!NOT_FOUND_OUTCOMES.has(detail.outcome)) continue;

    const saveError =
      detail.outcome === "failed"
        ? stats.failed.find((f) => f.companyName === detail.companyName)
            ?.message
        : undefined;

    entries.push({
      companyName: detail.companyName,
      reportYear,
      outcome: detail.outcome,
      reason: reasonForOutcome(detail.outcome, detail),
      aiExplanation: detail.llm?.reasoning || undefined,
      aiConfidencePct: detail.llm
        ? Math.round(detail.llm.confidence * 100)
        : undefined,
      aiDetectedYear: detail.llm?.detectedYear ?? undefined,
      discoverySource: detail.discoverySource,
      saveError,
      candidatesConsidered: detail.candidates.map((c) => ({
        url: c.url,
        pagesRead: c.pagesRead,
        prefilterSkipped: Boolean(c.prefilterSkipped),
        wasAiChoice: c.isLlmChoice,
      })),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    reportYear,
    summary: {
      companiesRequested: stats.companiesRequested,
      added: stats.added.length,
      notFound: entries.length,
    },
    entries,
  };
}

export function autoSearchLogToJson(log: AutoSearchLog): string {
  return JSON.stringify(log, null, 2);
}
