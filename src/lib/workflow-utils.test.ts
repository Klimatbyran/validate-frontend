import { describe, expect, it } from "vitest";
import { getJobStatus } from "./workflow-utils";

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
