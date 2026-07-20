import { describe, expect, it } from "vitest";
import type { GarboCompanyDetail } from "./types";
import {
  availableIdentifierTypesToAdd,
  buildEditableIdentifiers,
} from "./company-identifiers";

const baseCompany: GarboCompanyDetail = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Test Co",
};

describe("buildEditableIdentifiers", () => {
  it("uses identifier rows when present", () => {
    const rows = buildEditableIdentifiers({
      ...baseCompany,
      wikidataId: "Q1",
      identifiers: [
        {
          id: "id-1",
          type: "WIKIDATA",
          value: "Q99",
          metadata: { verifiedBy: { name: "Ada" } },
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "WIKIDATA",
      value: "Q99",
      verified: true,
      isNew: false,
    });
  });

  it("falls back to legacy wikidataId and lei columns", () => {
    const rows = buildEditableIdentifiers({
      ...baseCompany,
      wikidataId: "Q123",
      lei: "5493001KJTIIGC8Y1R12",
    });

    expect(rows.map((row) => row.type)).toEqual(["WIKIDATA", "LEI"]);
    expect(rows.every((row) => !row.verified)).toBe(true);
  });
});

describe("availableIdentifierTypesToAdd", () => {
  it("returns missing types only", () => {
    expect(availableIdentifierTypesToAdd(["WIKIDATA", "LEI"])).toEqual([
      "ORG_NUMBER",
      "ISIN",
    ]);
  });
});
