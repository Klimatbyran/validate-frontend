import { describe, expect, it } from "vitest";
import {
  pipelineContextFromRunItem,
  urlContextsFromRunItems,
} from "@/lib/pipeline-company-context";

describe("pipeline-company-context", () => {
  it("builds url context from run item fields", () => {
    expect(
      pipelineContextFromRunItem({
        url: "https://example.com/r.pdf",
        companyId: "11111111-1111-4111-8111-111111111111",
        companyName: "Meta",
        wikidataId: "Q380",
      }),
    ).toEqual({
      url: "https://example.com/r.pdf",
      companyId: "11111111-1111-4111-8111-111111111111",
      companyName: "Meta",
      wikidataId: "Q380",
    });
  });

  it("returns undefined when no identifiers are present", () => {
    expect(
      urlContextsFromRunItems([
        {
          url: "https://example.com/r.pdf",
          companyName: null,
          wikidataId: null,
        },
      ]),
    ).toBeUndefined();
  });

  it("filters items without identity fields", () => {
    expect(
      urlContextsFromRunItems([
        { url: "https://a.test/r.pdf", wikidataId: "Q1" },
        { url: "https://b.test/r.pdf" },
      ]),
    ).toEqual([{ url: "https://a.test/r.pdf", wikidataId: "Q1" }]);
  });
});
