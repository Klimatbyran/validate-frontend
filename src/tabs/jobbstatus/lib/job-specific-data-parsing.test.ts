import { describe, it, expect } from "vitest";
import {
  getCompanyLinkApprovalData,
  getWikidataApprovalData,
} from "./job-specific-data-parsing";

describe("getWikidataApprovalData", () => {
  it("falls back to job.data.wikidata when approval payload omits nested wikidata", () => {
    const job = {
      data: {
        wikidata: {
          node: "Q123",
          url: "https://www.wikidata.org/wiki/Q123",
          label: "Test Co",
        },
        approval: {
          type: "wikidata",
          approved: false,
          summary: "Wikidata selection for Test Co",
          data: { newValue: {} },
        },
      },
    };

    expect(getWikidataApprovalData(job as any)).toMatchObject({
      status: "pending_approval",
      wikidata: { node: "Q123", label: "Test Co" },
    });
  });

  it("marks approved no-wikidata decisions without exposing a Q-id", () => {
    const job = {
      data: {
        approval: {
          type: "wikidata",
          approved: true,
          verifiedByUserId: "user-1",
          summary: "Wikidata selection for Test Co",
          data: {
            newValue: {
              noWikidata: true,
              wikidata: null,
            },
          },
        },
      },
    };

    expect(getWikidataApprovalData(job as any)).toEqual({
      status: "approved_no_wikidata",
      noWikidata: true,
      message: "Wikidata selection for Test Co",
      metadata: {},
      autoApproved: false,
      verifiedByUserId: "user-1",
    });
  });

  it("still recognizes no-wikidata when a stale suggested Q-id remains merged in", () => {
    const job = {
      data: {
        approval: {
          type: "wikidata",
          approved: true,
          data: {
            newValue: {
              noWikidata: true,
              wikidata: {
                node: "Q123",
                url: "https://www.wikidata.org/wiki/Q123",
                label: "Test Co",
              },
            },
          },
        },
      },
    };

    expect(getWikidataApprovalData(job as any)).toMatchObject({
      status: "approved_no_wikidata",
      noWikidata: true,
    });
    expect(getWikidataApprovalData(job as any)?.wikidata).toBeUndefined();
  });
});

describe("getCompanyLinkApprovalData", () => {
  it("parses pending company link approval from precheck job data", () => {
    const job = {
      data: {
        approval: {
          type: "companyLink",
          approved: false,
          summary: "Company link for Alfa Laval AB",
          metadata: {
            source: "company-name-search",
            comment: "Multiple matching companies found",
          },
          data: {
            newValue: {
              extractedName: "Alfa Laval AB",
              candidates: [
                { id: "alfa-1", name: "Alfa Laval", wikidataId: "Q686030" },
                { id: "alfa-2", name: "Alfa Laval", wikidataId: "Q686030" },
              ],
            },
          },
        },
      },
    };

    expect(getCompanyLinkApprovalData(job as any)).toMatchObject({
      status: "pending_approval",
      extractedName: "Alfa Laval AB",
      candidates: [
        { id: "alfa-1", name: "Alfa Laval", wikidataId: "Q686030" },
        { id: "alfa-2", name: "Alfa Laval", wikidataId: "Q686030" },
      ],
      allowCreateNew: true,
      partialNameMatch: false,
      message: "Company link for Alfa Laval AB",
      metadata: {
        source: "company-name-search",
        comment: "Multiple matching companies found",
      },
    });
  });

  it("allows create new on partial name match approvals", () => {
    const job = {
      data: {
        approval: {
          type: "companyLink",
          approved: false,
          summary: "Company link for Wise Group AB (publ)",
          data: {
            newValue: {
              extractedName: "Wise Group AB (publ)",
              partialNameMatch: true,
              displayName: "Wise Group AB (publ)",
              candidates: [{ id: "wise-plc", name: "Wise plc" }],
            },
          },
        },
      },
    };

    expect(getCompanyLinkApprovalData(job as any)).toMatchObject({
      status: "pending_approval",
      partialNameMatch: true,
      allowCreateNew: true,
      displayName: "Wise Group AB (publ)",
    });
  });

  it("parses approved company link selection", () => {
    const job = {
      data: {
        approval: {
          type: "companyLink",
          approved: true,
          data: {
            newValue: {
              extractedName: "Alfa Laval AB",
              candidates: [
                { id: "alfa-1", name: "Alfa Laval", wikidataId: "Q686030" },
              ],
              companyId: "alfa-1",
            },
          },
        },
      },
    };

    expect(getCompanyLinkApprovalData(job as any)).toMatchObject({
      status: "approved",
      selectedCompanyId: "alfa-1",
      createNew: false,
    });
  });

  it("parses approved search pick companyName", () => {
    const job = {
      data: {
        approval: {
          type: "companyLink",
          approved: true,
          data: {
            newValue: {
              extractedName: "The Group",
              candidates: [{ id: "candidate-1", name: "The Adecco Group" }],
              companyId: "searched-company-id",
              companyName: "The Right Group AB",
            },
          },
        },
      },
    };

    expect(getCompanyLinkApprovalData(job as any)).toMatchObject({
      status: "approved",
      selectedCompanyId: "searched-company-id",
      selectedCompanyName: "The Right Group AB",
      createNew: false,
    });
  });
});
