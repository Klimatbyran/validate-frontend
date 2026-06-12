import { describe, expect, it } from "vitest";
import type { ArchiveRunSummary } from "@/tabs/jobbstatus/lib/archive-types";
import { buildCompanyYearRows } from "./build-overview-rows";

function archiveRun(
  overrides: Partial<ArchiveRunSummary> & Pick<ArchiveRunSummary, "threadId">,
): ArchiveRunSummary {
  return {
    id: overrides.threadId,
    pdfUrl: "https://example.com/report-2024.pdf",
    companyName: "Acme",
    wikidataId: "Q1",
    status: "completed",
    startedAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    jobs: [],
    ...overrides,
  };
}

describe("buildCompanyYearRows pipeline errors status", () => {
  const baseInput = {
    registry: [],
    stageCompanies: [
      {
        id: "company-1",
        name: "Acme",
        wikidataId: "Q1",
        reportingPeriods: [],
      },
    ],
    prodCompanies: [],
  };

  it("marks pipeline errors as missing when no archived run exists", () => {
    const [row] = buildCompanyYearRows({
      ...baseInput,
      archiveRuns: [],
    }).filter((entry) => entry.reportYear === "2024");

    expect(row?.statuses.pipeline?.kind).toBe("missing");
    expect(row?.statuses.pipelineErrors?.kind).toBe("missing");
    expect(row?.statuses.pipelineErrors?.summary).toBe("Not assessed");
  });

  it("marks pipeline errors as ok only when all archived jobs completed", () => {
    const [row] = buildCompanyYearRows({
      ...baseInput,
      archiveRuns: [
        archiveRun({
          threadId: "thread-1",
          wikidataId: "Q1",
          jobs: [
            {
              jobId: "job-1",
              queueName: "parsePdf",
              status: "completed",
              failedReason: null,
              startedAt: "2024-01-01T00:00:00.000Z",
              finishedAt: "2024-01-01T01:00:00.000Z",
            },
          ],
        }),
      ],
    }).filter((entry) => entry.reportYear === "2024");

    expect(row?.statuses.pipeline?.kind).toBe("ok");
    expect(row?.statuses.pipelineErrors?.kind).toBe("ok");
  });

  it("does not mark pipeline errors as ok when the archived run has no jobs", () => {
    const [row] = buildCompanyYearRows({
      ...baseInput,
      archiveRuns: [
        archiveRun({
          threadId: "thread-2",
          wikidataId: "Q1",
          jobs: [],
        }),
      ],
    }).filter((entry) => entry.reportYear === "2024");

    expect(row?.statuses.pipeline?.kind).toBe("ok");
    expect(row?.statuses.pipelineErrors?.kind).toBe("missing");
  });
});
