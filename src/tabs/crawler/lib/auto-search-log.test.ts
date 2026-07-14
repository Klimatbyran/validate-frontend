import { describe, expect, it } from "vitest";
import { buildAutoSearchLog } from "./auto-search-log";
import type { AutoSearchStats } from "./crawler-types";

function baseStats(overrides: Partial<AutoSearchStats> = {}): AutoSearchStats {
  return {
    companiesRequested: 0,
    companiesWithResults: 0,
    candidatesFetched: 0,
    candidatesAnalyzed: 0,
    added: [],
    skippedNoResults: [],
    skippedAnalyzeFailed: [],
    skippedLlmFailed: [],
    skippedLowConfidence: [],
    skippedAlreadyInRegistry: [],
    failed: [],
    companyDetails: [],
    ...overrides,
  };
}

describe("buildAutoSearchLog", () => {
  it("logs only not-found companies, excluding added / already-in-registry", () => {
    const stats = baseStats({
      companiesRequested: 4,
      added: [
        {
          id: "1",
          companyName: "Saved Co",
          reportYear: "2025",
          url: "https://x/r.pdf",
        },
      ],
      companyDetails: [
        {
          companyName: "Saved Co",
          outcome: "added",
          candidates: [
            { url: "https://x/r.pdf", pagesRead: 1, isLlmChoice: true, isWinner: true },
          ],
        },
        {
          companyName: "Dup Co",
          outcome: "already_in_registry",
          candidates: [],
        },
        {
          companyName: "NoPdf Co",
          outcome: "no_results",
          candidates: [],
        },
        {
          companyName: "LowConf Co",
          outcome: "low_confidence",
          discoverySource: "web_search",
          candidates: [
            { url: "https://y/a.pdf", pagesRead: 1, isLlmChoice: true, isWinner: false },
          ],
          llm: {
            url: "https://y/a.pdf",
            confidence: 0.3,
            detectedYear: "2024",
            reasoning: "Cover says 2024, not the requested 2025.",
          },
        },
      ],
    });

    const log = buildAutoSearchLog(stats, "2025");

    expect(log.summary).toEqual({
      companiesRequested: 4,
      added: 1,
      notFound: 2,
    });
    expect(log.entries.map((e) => e.companyName)).toEqual([
      "NoPdf Co",
      "LowConf Co",
    ]);
  });

  it("carries the AI's verbatim reasoning, confidence and detected year", () => {
    const stats = baseStats({
      companiesRequested: 1,
      companyDetails: [
        {
          companyName: "LowConf Co",
          outcome: "low_confidence",
          discoverySource: "web_search",
          candidates: [
            { url: "https://y/a.pdf", pagesRead: 1, isLlmChoice: true, isWinner: false },
          ],
          llm: {
            url: "https://y/a.pdf",
            confidence: 0.3,
            detectedYear: "2024",
            reasoning: "Cover says 2024, not the requested 2025.",
          },
        },
      ],
    });

    const entry = buildAutoSearchLog(stats, "2025").entries[0];
    expect(entry.aiExplanation).toBe("Cover says 2024, not the requested 2025.");
    expect(entry.aiConfidencePct).toBe(30);
    expect(entry.aiDetectedYear).toBe("2024");
    expect(entry.candidatesConsidered).toEqual([
      {
        url: "https://y/a.pdf",
        pagesRead: 1,
        prefilterSkipped: false,
        wasAiChoice: true,
      },
    ]);
  });

  it("attaches the save error message for failed saves", () => {
    const stats = baseStats({
      companiesRequested: 1,
      failed: [
        {
          error: "unknown",
          companyName: "Broken Co",
          reportYear: "2025",
          message: "500 from registry",
        },
      ],
      companyDetails: [
        {
          companyName: "Broken Co",
          outcome: "failed",
          candidates: [
            { url: "https://z/r.pdf", pagesRead: 1, isLlmChoice: true, isWinner: true },
          ],
        },
      ],
    });

    const entry = buildAutoSearchLog(stats, "2025").entries[0];
    expect(entry.outcome).toBe("failed");
    expect(entry.saveError).toBe("500 from registry");
  });

  it("gives a no-results entry an explanation even with no AI data", () => {
    const stats = baseStats({
      companiesRequested: 1,
      companyDetails: [
        { companyName: "Ghost Co", outcome: "no_results", candidates: [] },
      ],
    });

    const entry = buildAutoSearchLog(stats, "2025").entries[0];
    expect(entry.aiExplanation).toBeUndefined();
    expect(entry.reason.length).toBeGreaterThan(0);
    expect(entry.candidatesConsidered).toEqual([]);
  });
});
