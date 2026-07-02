import type {
  CompanyReport,
  LlmSelectionResult,
  PrefilterReportResult,
  SelectedReport,
} from "./crawler-types";
import {
  fetchPdfText,
  prefilterReportCandidates,
  selectReportWithLlm,
} from "./crawler-api";

/** MuPDF reads page 1; we only send the leading cover text to the LLM. */
const PDF_TEXT_MAX_PAGES = 1;
const PDF_COVER_TEXT_CHARS = 1000;
const CANDIDATE_CONCURRENCY = Math.max(
  1,
  Math.min(
    6,
    Number(import.meta.env.VITE_AUTO_SEARCH_PDF_CONCURRENCY ?? 3),
  ),
);
/** Only auto-save when the LLM is at least this confident (0..1). */
export const LLM_MIN_CONFIDENCE = 0.5;

export type AnalyzedCandidate = {
  url: string;
  pagesRead: number;
  isLlmChoice: boolean;
  prefilterSkipped?: boolean;
};

export type CompanyAutoSearchResult =
  | { kind: "no_results"; companyName: string }
  | { kind: "analyze_failed"; companyName: string }
  | {
      kind: "low_confidence";
      companyName: string;
      confidence: number;
      suggestedUrl?: string;
    }
  | {
      kind: "winner";
      report: SelectedReport;
      confidence: number;
    };

export type CompanyAutoSearchRunResult = {
  result: CompanyAutoSearchResult;
  candidatesAnalyzed: number;
  candidates: AnalyzedCandidate[];
  prefilter?: PrefilterReportResult;
  llm?: LlmSelectionResult;
};

function normalizeCoverText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, PDF_COVER_TEXT_CHARS);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function pickBestReportForCompany(
  companyReport: CompanyReport,
  reportYear: string,
  wikidataId?: string,
  onCandidateProgress?: (candidateIndex: number, candidateTotal: number) => void,
): Promise<CompanyAutoSearchRunResult> {
  const candidateSources = companyReport.results
    .map((r) => ({
      url: r.url?.trim(),
      title: r.title?.trim() || undefined,
      description: r.description?.trim() || undefined,
    }))
    .filter((c): c is { url: string; title?: string; description?: string } =>
      Boolean(c.url),
    );

  if (candidateSources.length === 0) {
    return {
      result: { kind: "no_results", companyName: companyReport.companyName },
      candidatesAnalyzed: 0,
      candidates: [],
    };
  }

  const prefilter = await prefilterReportCandidates({
    companyName: companyReport.companyName,
    reportYear,
    candidates: candidateSources,
  });

  const analyzeIndices =
    prefilter === null
      ? candidateSources.map((_, i) => i)
      : prefilter.analyzeIndices;

  const skippedUrls = new Set(
    candidateSources
      .map((c, i) => (analyzeIndices.includes(i) ? null : c.url))
      .filter((u): u is string => Boolean(u)),
  );

  const toAnalyze = analyzeIndices
    .map((i) => candidateSources[i])
    .filter(
      (c): c is { url: string; title?: string; description?: string } =>
        Boolean(c?.url),
    );

  const skippedCandidates: AnalyzedCandidate[] = candidateSources
    .filter((c) => skippedUrls.has(c.url))
    .map((c) => ({
      url: c.url,
      pagesRead: 0,
      isLlmChoice: false,
      prefilterSkipped: true,
    }));

  if (toAnalyze.length === 0) {
    return {
      result: { kind: "no_results", companyName: companyReport.companyName },
      candidatesAnalyzed: 0,
      candidates: skippedCandidates,
      prefilter: prefilter ?? undefined,
    };
  }

  type ExtractedCandidate = {
    url: string;
    title?: string;
    description?: string;
    text: string;
    pagesRead: number;
  };

  const extracted: ExtractedCandidate[] = [];
  await mapWithConcurrency(
    toAnalyze,
    CANDIDATE_CONCURRENCY,
    async (source, idx) => {
      onCandidateProgress?.(idx + 1, toAnalyze.length);
      const pdf = await fetchPdfText(source.url, PDF_TEXT_MAX_PAGES);
      if (pdf && pdf.textLength > 0) {
        extracted.push({
          url: source.url,
          title: source.title,
          description: source.description,
          text: normalizeCoverText(pdf.text),
          pagesRead: pdf.pagesRead,
        });
      }
      return pdf;
    },
  );

  const allCandidates: AnalyzedCandidate[] = [
    ...skippedCandidates,
    ...extracted.map((c) => ({
      url: c.url,
      pagesRead: c.pagesRead,
      isLlmChoice: false,
      prefilterSkipped: false,
    })),
  ];

  if (extracted.length === 0) {
    return {
      result:
        toAnalyze.length > 0
          ? { kind: "analyze_failed", companyName: companyReport.companyName }
          : { kind: "no_results", companyName: companyReport.companyName },
      candidatesAnalyzed: 0,
      candidates: allCandidates,
      prefilter: prefilter ?? undefined,
    };
  }

  const llm = await selectReportWithLlm({
    companyName: companyReport.companyName,
    reportYear,
    candidates: extracted.map((c) => ({
      url: c.url,
      title: c.title,
      description: c.description,
      text: c.text,
    })),
  });

  const confidence = llm?.confidence ?? 0;
  const llmChosenUrl =
    llm?.url &&
    confidence >= LLM_MIN_CONFIDENCE &&
    extracted.some((c) => c.url === llm.url)
      ? llm.url
      : null;

  for (const c of allCandidates) {
    c.isLlmChoice = c.url === llmChosenUrl;
  }

  if (llm === null) {
    return {
      result: {
        kind: "analyze_failed",
        companyName: companyReport.companyName,
      },
      candidatesAnalyzed: extracted.length,
      candidates: allCandidates,
      prefilter: prefilter ?? undefined,
    };
  }

  if (llmChosenUrl) {
    return {
      result: {
        kind: "winner",
        report: {
          companyName: companyReport.companyName,
          reportYear,
          url: llmChosenUrl,
          wikidataId,
        },
        confidence,
      },
      candidatesAnalyzed: extracted.length,
      candidates: allCandidates,
      prefilter: prefilter ?? undefined,
      llm: llm ?? undefined,
    };
  }

  return {
    result: {
      kind: "low_confidence",
      companyName: companyReport.companyName,
      confidence,
      suggestedUrl: llm?.url ?? extracted[0]?.url,
    },
    candidatesAnalyzed: extracted.length,
    candidates: allCandidates,
    prefilter: prefilter ?? undefined,
    llm: llm ?? undefined,
  };
}
