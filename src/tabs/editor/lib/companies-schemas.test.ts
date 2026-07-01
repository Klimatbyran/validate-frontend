import { describe, expect, it } from "vitest";
import { parseGarboCompanyDetail } from "./companies-schemas";

describe("parseGarboCompanyDetail", () => {
  it("parses company with null wikidataId and identifiers", () => {
    const parsed = parseGarboCompanyDetail({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Example AB",
      wikidataId: null,
      identifiers: [
        {
          id: "id1",
          type: "WIKIDATA",
          value: "Q12345",
          metadata: { verifiedBy: null },
        },
        {
          id: "id2",
          type: "LEI",
          value: "5493001KJTIIGC8Y1R12",
          metadata: {
            verifiedBy: { name: "Reviewer" },
          },
        },
      ],
    });

    expect(parsed.wikidataId).toBeNull();
    expect(parsed.identifiers).toHaveLength(2);
    expect(parsed.identifiers?.[1].metadata?.verifiedBy?.name).toBe("Reviewer");
  });

  it("parses company with wikidataId and no identifiers", () => {
    const parsed = parseGarboCompanyDetail({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Example AB",
      wikidataId: "Q999",
    });

    expect(parsed.wikidataId).toBe("Q999");
    expect(parsed.identifiers).toBeUndefined();
  });
});
