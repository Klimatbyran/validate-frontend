import { describe, it, expect } from "vitest";
import { getCompanyLinkApprovalData } from "./job-specific-data-parsing";

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

    expect(getCompanyLinkApprovalData(job as any)).toEqual({
      status: "pending_approval",
      extractedName: "Alfa Laval AB",
      candidates: [
        { id: "alfa-1", name: "Alfa Laval", wikidataId: "Q686030" },
        { id: "alfa-2", name: "Alfa Laval", wikidataId: "Q686030" },
      ],
      allowCreateNew: true,
      message: "Company link for Alfa Laval AB",
      metadata: {
        source: "company-name-search",
        comment: "Multiple matching companies found",
      },
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
