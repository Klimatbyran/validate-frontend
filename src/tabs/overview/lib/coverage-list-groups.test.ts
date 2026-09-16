import { describe, expect, it } from "vitest";
import {
  groupCoverageLists,
  slugFromLabel,
  type CoverageListFocus,
} from "./coverage-list-groups";
import type {
  CoverageListGroup,
  CoverageListSummary,
} from "./coverage-types";

function list(
  id: string,
  name: string,
  group: CoverageListSummary["group"],
): CoverageListSummary {
  return {
    id,
    name,
    updatedAt: "2026-01-01T00:00:00.000Z",
    group,
    years: [],
  };
}

const groups: CoverageListGroup[] = [
  { id: "g1", slug: "msci_acwi", label: "MSCI ACWI", listCount: 1 },
  { id: "g2", slug: "client_lists", label: "Client lists", listCount: 0 },
];

describe("groupCoverageLists", () => {
  const lists = [
    list("l1", "ACWI Core", { id: "g1", slug: "msci_acwi", label: "MSCI ACWI" }),
    list("l2", "Nordic clients", null),
    list("l3", "ACWI Small", {
      id: "g1",
      slug: "msci_acwi",
      label: "MSCI ACWI",
    }),
  ];

  it("builds a section per group plus ungrouped", () => {
    const sections = groupCoverageLists(lists, groups);
    expect(sections.map((section) => section.key)).toEqual([
      "g1",
      "g2",
      "ungrouped",
    ]);
    expect(sections[0]?.lists).toHaveLength(2);
    expect(sections[1]?.lists).toHaveLength(0);
    expect(sections[2]?.lists.map((item) => item.id)).toEqual(["l2"]);
  });

  it("focuses a single group", () => {
    const focus: CoverageListFocus = { kind: "group", groupId: "g1" };
    const sections = groupCoverageLists(lists, groups, { focus });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("g1");
  });

  it("filters by search and hides empty sections", () => {
    const sections = groupCoverageLists(lists, groups, { search: "nordic" });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("ungrouped");
  });
});

describe("slugFromLabel", () => {
  it("slugifies labels", () => {
    expect(slugFromLabel("Country Indexes")).toBe("country-indexes");
  });
});
