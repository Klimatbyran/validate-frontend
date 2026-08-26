import { describe, expect, it } from "vitest";

import { labeledHitsToSelectedReports } from "./crawler-utils";
import type { CompanyReport } from "./crawler-types";

describe("labeledHitsToSelectedReports", () => {
  const now = new Date().getFullYear();
  const recent = String(now);
  const lastYear = String(now - 1);
  const lookback = String(now - 4);

  const company: CompanyReport = {
    companyName: "Walmart",
    wikidataId: "Q483551",
    results: [
      {
        url: `https://example.com/sust-${recent}.pdf`,
        reportYear: recent,
        reportType: "Sustainability report",
        reportTypeSlug: "sustainability-report",
        s3Url: `https://storage.example/sust-${recent}.pdf`,
        s3Key: "uploads/dev/sust.pdf",
        s3Bucket: "bucket",
        sha256: "aa",
      },
      {
        url: `https://example.com/annual-${recent}.pdf`,
        reportYear: recent,
        reportType: "Annual report",
        reportTypeSlug: "annual-report",
        s3Url: `https://storage.example/annual-${recent}.pdf`,
      },
      {
        url: `https://example.com/sust-${recent}-dup.pdf`,
        reportYear: recent,
        reportTypeSlug: "sustainability-report",
        s3Url: `https://storage.example/sust-${recent}-dup.pdf`,
      },
      {
        url: `https://example.com/unlabeled.pdf`,
        reportYear: lastYear,
      },
      {
        url: "https://example.com/blocked.pdf",
        reportYear: String(now - 2),
        reportTypeSlug: "annual-report",
        s3Url: "https://storage.example/blocked.pdf",
        fetchFailed: true,
      },
      {
        url: `https://example.com/labeled-no-s3.pdf`,
        reportYear: lookback,
        reportTypeSlug: "csr-report",
      },
    ],
  };

  it("saves fetched hits including unlabeled PDFs as other", () => {
    expect(labeledHitsToSelectedReports([company])).toEqual([
      {
        companyName: "Walmart",
        reportYear: recent,
        url: `https://example.com/sust-${recent}.pdf`,
        wikidataId: "Q483551",
        reportTypeSlug: "sustainability-report",
        s3Url: `https://storage.example/sust-${recent}.pdf`,
        s3Key: "uploads/dev/sust.pdf",
        s3Bucket: "bucket",
        sha256: "aa",
      },
      {
        companyName: "Walmart",
        reportYear: recent,
        url: `https://example.com/annual-${recent}.pdf`,
        wikidataId: "Q483551",
        reportTypeSlug: "annual-report",
        s3Url: `https://storage.example/annual-${recent}.pdf`,
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
      {
        companyName: "Walmart",
        reportYear: recent,
        url: `https://example.com/sust-${recent}-dup.pdf`,
        wikidataId: "Q483551",
        reportTypeSlug: "sustainability-report",
        s3Url: `https://storage.example/sust-${recent}-dup.pdf`,
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
      {
        companyName: "Walmart",
        reportYear: lookback,
        url: "https://example.com/labeled-no-s3.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "csr-report",
        s3Url: undefined,
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
      {
        companyName: "Walmart",
        reportYear: lastYear,
        url: "https://example.com/unlabeled.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "other",
        s3Url: undefined,
        s3Key: undefined,
        sha256: undefined,
        s3Bucket: undefined,
      },
    ]);
  });
});
