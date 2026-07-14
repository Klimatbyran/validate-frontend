import type {
  CompanyReport,
  LlmSelectionResult,
  SelectedReport,
} from "./crawler-types";
import { fetchPdfText, selectReportWithLlm } from "./crawler-api";
import {
  pickHeuristicReportCandidate,
  pickMetadataOnlyReportCandidate,
  urlMatchesCompany,
} from "./auto-search-heuristic";

/** MuPDF reads page 1; we only send the leading cover text to the LLM. */
const PDF_TEXT_MAX_PAGES = 1;
const PDF_COVER_TEXT_CHARS = 1000;
const CANDIDATE_CONCURRENCY = Math.max(
  1,
  Math.min(6, Number(import.meta.env.VITE_AUTO_SEARCH_PDF_CONCURRENCY ?? 6)),
);
/** Only auto-save when the LLM is at least this confident (0..1). */
export const LLM_MIN_CONFIDENCE = 0.5;
/**
 * At/above this confidence a direct LLM pick is trusted as-is (company + year),
 * bypassing the mechanical company-name guard. The model has read the cover and
 * asserted the match; filing/CDN hosts (mb.cision.com, cdn.sanity.io, …) often
 * carry no company name in the URL, metadata, OR extractable cover text.
 */
const HIGH_CONFIDENCE_TRUST = 0.75;
/** Below this many chars of cover text, treat extraction as unusable for the LLM. */
const MIN_COVER_TEXT_FOR_LLM = 10;

export type AnalyzedCandidate = {
  url: string;
  pagesRead: number;
  isLlmChoice: boolean;
  prefilterSkipped?: boolean;
};

export type CompanyAutoSearchResult =
  | { kind: "no_results"; companyName: string }
  | { kind: "analyze_failed"; companyName: string }
  | { kind: "llm_failed"; companyName: string }
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
  llm?: LlmSelectionResult;
};

function normalizeCoverText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, PDF_COVER_TEXT_CHARS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Selection call with one delayed retry: transient API failures (dev-server
 * restart, momentary 5xx) shouldn't discard successfully extracted candidates.
 */
async function selectReportWithLlmRetry(
  input: Parameters<typeof selectReportWithLlm>[0],
): Promise<LlmSelectionResult | null> {
  const first = await selectReportWithLlm(input);
  if (first) return first;
  await sleep(4000);
  return selectReportWithLlm(input);
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

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function pickBestReportForCompany(
  companyReport: CompanyReport,
  reportYear: string,
  wikidataId?: string,
  onCandidateProgress?: (
    candidateIndex: number,
    candidateTotal: number,
  ) => void,
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

  const toAnalyze = candidateSources;

  type ExtractedCandidate = {
    url: string;
    title?: string;
    description?: string;
    text: string;
    pagesRead: number;
  };

  async function extractPdfCandidates(
    sources: Array<{ url: string; title?: string; description?: string }>,
    onProgress?: (candidateIndex: number, candidateTotal: number) => void,
  ): Promise<ExtractedCandidate[]> {
    const extracted: ExtractedCandidate[] = [];
    await mapWithConcurrency(
      sources,
      CANDIDATE_CONCURRENCY,
      async (source, idx) => {
        onProgress?.(idx + 1, sources.length);
        const pdf = await fetchPdfText(source.url, PDF_TEXT_MAX_PAGES);
        const coverText = pdf ? normalizeCoverText(pdf.text) : "";
        // Image-only / scanned covers extract as near-empty text; the LLM has
        // nothing to judge and rejects them. Skip here so they fall through to
        // the URL/metadata fallback, which can still confirm company + year.
        if (pdf && coverText.length >= MIN_COVER_TEXT_FOR_LLM) {
          extracted.push({
            url: source.url,
            title: source.title,
            description: source.description,
            text: coverText,
            pagesRead: pdf.pagesRead,
          });
        }
        return pdf;
      },
    );
    return extracted;
  }

  const extracted = await extractPdfCandidates(toAnalyze, onCandidateProgress);

  const allCandidates: AnalyzedCandidate[] = extracted.map((c) => ({
    url: c.url,
    pagesRead: c.pagesRead,
    isLlmChoice: false,
  }));

  if (extracted.length === 0) {
    const metadataOnly = pickMetadataOnlyReportCandidate(
      candidateSources,
      companyReport.companyName,
      reportYear,
    );
    if (metadataOnly) {
      return {
        result: {
          kind: "winner",
          report: {
            companyName: companyReport.companyName,
            reportYear,
            url: metadataOnly.url,
            wikidataId,
          },
          confidence: 0.58,
        },
        candidatesAnalyzed: 0,
        candidates: candidateSources.map((c) => ({
          url: c.url,
          pagesRead: 0,
          isLlmChoice: c.url === metadataOnly.url,
        })),
      };
    }

    const metadataLlm = await selectReportWithLlmRetry({
      companyName: companyReport.companyName,
      reportYear,
      candidates: candidateSources.map((c) => ({
        url: c.url,
        title: c.title,
        description: c.description,
        text: "",
      })),
    });

    const metadataConfidence = metadataLlm?.confidence ?? 0;
    const metadataChosenUrl =
      metadataLlm?.url &&
      metadataConfidence >= LLM_MIN_CONFIDENCE &&
      candidateSources.some((c) => c.url === metadataLlm.url)
        ? metadataLlm.url
        : null;

    if (metadataChosenUrl) {
      return {
        result: {
          kind: "winner",
          report: {
            companyName: companyReport.companyName,
            reportYear,
            url: metadataChosenUrl,
            wikidataId,
          },
          confidence: metadataConfidence,
        },
        candidatesAnalyzed: 0,
        candidates: candidateSources.map((c) => ({
          url: c.url,
          pagesRead: 0,
          isLlmChoice: c.url === metadataChosenUrl,
        })),
        llm: metadataLlm ?? undefined,
      };
    }

    return {
      result: {
        kind: "analyze_failed",
        companyName: companyReport.companyName,
      },
      candidatesAnalyzed: 0,
      candidates: candidateSources.map((c) => ({
        url: c.url,
        pagesRead: 0,
        isLlmChoice: false,
      })),
    };
  }

  const llm = await selectReportWithLlmRetry({
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
  let llmChosenUrl =
    llm?.url &&
    confidence >= LLM_MIN_CONFIDENCE &&
    extracted.some((c) => c.url === llm.url)
      ? llm.url
      : null;

  let effectiveConfidence = confidence;

  // Heuristic corroboration: only rescues a pick the LLM actually made but
  // scored just below the threshold, and only when the heuristic agrees on
  // the same URL. An explicit LLM rejection (url null / 0% confidence) is
  // final — we never save a report the AI rejected.
  if (!llmChosenUrl && llm?.url && confidence > 0) {
    const heuristic = pickHeuristicReportCandidate(
      extracted,
      companyReport.companyName,
      reportYear,
    );
    if (heuristic && heuristic.url === llm.url) {
      llmChosenUrl = heuristic.url;
      effectiveConfidence = Math.max(confidence, 0.55);
    }
  }

  if (llmChosenUrl) {
    const chosen = extracted.find((c) => c.url === llmChosenUrl);
    const detectedYearMatches =
      !llm?.detectedYear || String(llm.detectedYear) === reportYear;
    const trustedHighConfidencePick =
      llm?.url === llmChosenUrl &&
      confidence >= HIGH_CONFIDENCE_TRUST &&
      detectedYearMatches;
    if (
      !trustedHighConfidencePick &&
      !urlMatchesCompany(
        llmChosenUrl,
        companyReport.companyName,
        chosen?.title,
        chosen?.description,
        {
          llmConfidence: effectiveConfidence,
          reportYear,
          text: chosen?.text,
        },
      )
    ) {
      llmChosenUrl = null;
    }
  }

  for (const c of allCandidates) {
    c.isLlmChoice = c.url === llmChosenUrl;
  }

  if (llm === null) {
    // Text extraction succeeded — the selection API call itself failed.
    // Report this distinctly so it's not confused with unreadable PDFs.
    return {
      result: {
        kind: "llm_failed",
        companyName: companyReport.companyName,
      },
      candidatesAnalyzed: extracted.length,
      candidates: allCandidates,
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
        confidence: effectiveConfidence,
      },
      candidatesAnalyzed: extracted.length,
      candidates: allCandidates,
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
    llm: llm ?? undefined,
  };
}
