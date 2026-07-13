import { describe, expect, it } from "vitest";
import {
  calculatePipelineStepStatus,
  getJobStatus,
  jobNeedsUserInteraction,
} from "./workflow-utils";
import type { SwimlaneYearData } from "./types";

describe("getJobStatus wikidata", () => {
  it("returns needs_approval when wikidata approval is pending", () => {
    const status = getJobStatus({
      queueId: "guessWikidata",
      status: "delayed",
      data: {
        approval: {
          type: "wikidata",
          approved: false,
          data: { newValue: { wikidata: { node: "Q1" } } },
        },
      },
    });

    expect(status).toBe("needs_approval");
  });

  it("returns wikidata_unverified when auto-approved without verifier", () => {
    const status = getJobStatus({
      queueId: "guessWikidata",
      status: "completed",
      finishedOn: Date.now(),
      data: {
        autoApprove: true,
        approval: {
          type: "wikidata",
          approved: true,
          data: { newValue: { wikidata: { node: "Q1" } } },
        },
      },
    });

    expect(status).toBe("wikidata_unverified");
  });

  it("returns completed when manually approved with verifier", () => {
    const status = getJobStatus({
      queueId: "guessWikidata",
      status: "completed",
      finishedOn: Date.now(),
      data: {
        autoApprove: false,
        approval: {
          type: "wikidata",
          approved: true,
          verifiedByUserId: "user-123",
          data: { newValue: { wikidata: { node: "Q1" } } },
        },
      },
    });

    expect(status).toBe("completed");
  });
});

describe("getJobStatus precheck company name", () => {
  it("returns needs_approval when precheck is delayed waiting for company name", () => {
    const status = getJobStatus({
      queueId: "precheck",
      status: "delayed",
      data: {
        waitingForCompanyName: true,
      },
    });

    expect(status).toBe("needs_approval");
  });

  it("returns needs_approval when delayed precheck has no company name", () => {
    const status = getJobStatus({
      queueId: "precheck",
      status: "delayed",
      data: {},
    });

    expect(status).toBe("needs_approval");
  });

  it("returns waiting when delayed precheck already has a company name", () => {
    const status = getJobStatus({
      queueId: "precheck",
      status: "delayed",
      data: { companyName: "Alfa Laval AB" },
    });

    expect(status).toBe("waiting");
  });

  it("returns needs_approval when delayed precheck only has placeholder Unknown", () => {
    const status = getJobStatus({
      queueId: "precheck",
      status: "delayed",
      data: { companyName: "Unknown" },
    });

    expect(status).toBe("needs_approval");
  });
});

describe("jobNeedsUserInteraction", () => {
  it("detects precheck waiting for manual company name", () => {
    expect(
      jobNeedsUserInteraction({
        queueId: "precheck",
        status: "delayed",
        data: { waitingForCompanyName: true },
      }),
    ).toBe(true);
  });
});

describe("calculatePipelineStepStatus preprocessing", () => {
  it("shows needs_approval when precheck awaits company name input", () => {
    const yearData: SwimlaneYearData = {
      year: 2025,
      attempts: 1,
      fields: {},
      jobs: [
        {
          queueId: "doclingParsePDF",
          status: "completed",
          finishedOn: Date.now(),
          data: { threadId: "thread-1" },
        },
        {
          queueId: "precheck",
          status: "delayed",
          processedOn: Date.now(),
          data: {
            threadId: "thread-1",
            companyName: "Unknown",
            waitingForCompanyName: true,
          },
        },
      ],
    };

    expect(calculatePipelineStepStatus(yearData, "preprocessing")).toBe(
      "needs_approval",
    );
  });
});
