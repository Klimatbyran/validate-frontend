import { describe, expect, it } from "vitest";

import { labeledHitsToSelectedReports } from "./crawler-utils";
import type { CompanyReport } from "./crawler-types";

describe("labeledHitsToSelectedReports", () => {
  const company: CompanyReport = {
    companyName: "Walmart",
    wikidataId: "Q483551",
    results: [
      {
        url: "https://example.com/sust-2025.pdf",
        reportYear: "2025",
        reportType: "Sustainability report",
        reportTypeSlug: "sustainability-report",
        s3Url: "https://storage.example/sust-2025.pdf",
        s3Key: "uploads/dev/sust.pdf",
        s3Bucket: "bucket",
        sha256: "aa",
      },
      {
        url: "https://example.com/annual-2025.pdf",
        reportYear: "2025",
        reportType: "Annual report",
        reportTypeSlug: "annual-report",
        s3Url: "https://storage.example/annual-2025.pdf",
      },
      {
        url: "https://example.com/sust-2025-dup.pdf",
        reportYear: "2025",
        reportTypeSlug: "sustainability-report",
        s3Url: "https://storage.example/sust-2025-dup.pdf",
      },
      {
        url: "https://example.com/unlabeled.pdf",
        reportYear: "2024",
      },
      {
        url: "https://example.com/blocked.pdf",
        reportYear: "2023",
        reportTypeSlug: "annual-report",
        s3Url: "https://storage.example/blocked.pdf",
        fetchFailed: true,
      },
      {
        url: "https://example.com/labeled-no-s3.pdf",
        reportYear: "2022",
        reportTypeSlug: "csr-report",
      },
    ],
  };

  it("saves fetched hits including unlabeled PDFs as other", () => {
    expect(labeledHitsToSelectedReports([company])).toEqual([
      {
        companyName: "Walmart",
        reportYear: "2025",
        url: "https://example.com/sust-2025.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "sustainability-report",
        s3Url: "https://storage.example/sust-2025.pdf",
        s3Key: "uploads/dev/sust.pdf",
        s3Bucket: "bucket",
        sha256: "aa",
      },
      {
        companyName: "Walmart",
        reportYear: "2025",
        url: "https://example.com/annual-2025.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "annual-report",
        s3Url: "https://storage.example/annual-2025.pdf",
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
      {
        companyName: "Walmart",
        reportYear: "2025",
        url: "https://example.com/sust-2025-dup.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "sustainability-report",
        s3Url: "https://storage.example/sust-2025-dup.pdf",
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
      {
        companyName: "Walmart",
        reportYear: "2022",
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
        reportYear: "2024",
        url: "https://example.com/unlabeled.pdf",
        wikidataId: "Q483551",
        reportTypeSlug: "other",
        s3Url: undefined,
        s3Key: undefined,
        s3Bucket: undefined,
        sha256: undefined,
      },
    ]);
  });
});
