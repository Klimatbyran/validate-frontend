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
});
