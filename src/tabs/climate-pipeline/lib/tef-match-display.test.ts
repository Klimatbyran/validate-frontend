import { describe, expect, it } from "vitest";
import {
  aiReviewHeadline,
  aiReviewPillLabel,
  matchMechanismLine,
  matchOutcomeLabel,
  reviewerChosenStableId,
  shiftTypesAgree,
  tefCategoryOf,
} from "./tef-match-display";

describe("match outcome labels", () => {
  it("names a specific hit and a domain-less proposal", () => {
    expect(matchOutcomeLabel("specific", "Transport", null)).toBe("Specific");
    expect(
      matchOutcomeLabel("none", null, "promoting_sustainable_tourism"),
    ).toBe("No domain: promoting_sustainable_tourism");
  });

  it("drops the boilerplate gate label", () => {
    expect(matchOutcomeLabel("none", null, "no domain named")).toBe(
      "No domain",
    );
  });
});

describe("shift type agreement", () => {
  it("treats the Prisma enum and TEF's label as the same category", () => {
    expect(shiftTypesAgree("TypeShift", "Type Shift")).toBe(true);
    expect(shiftTypesAgree("TypeShift", "Resource Shift")).toBe(false);
  });
});

describe("TEF category and review copy", () => {
  it("prefers TEF's own category over the old stand-in", () => {
    expect(
      tefCategoryOf({
        activityShiftCategory: "Type Shift",
        ourShiftType: "Resource Shift",
      }),
    ).toBe("Type Shift");
  });

  it("turns a correct no-match into the reviewer headline", () => {
    expect(aiReviewHeadline("CORRECT_NO_MATCH")).toBe(
      "Confirmed: no match warranted",
    );
    expect(aiReviewPillLabel("JUDGE_ERROR")).toBe("Judge error");
    expect(aiReviewPillLabel("RETRIEVAL_MISS")).toBe("Taxonomy miss");
    expect(aiReviewPillLabel("TAXONOMY_GAP")).toBe("Taxonomy gap");
  });

  it("picks the candidate the judge-error review names first", () => {
    expect(
      reviewerChosenStableId(
        "increased_proportion_of_walking_and_cycling directly fits",
        ["shift_to_electric_bikes", "increased_proportion_of_walking_and_cycling"],
      ),
    ).toBe("increased_proportion_of_walking_and_cycling");
  });

  it("keeps the judge's mechanism sentence when one was stored", () => {
    expect(
      matchMechanismLine({
        matchReasoning: 'acts_on "petrol vehicles" matches shift\'s FROM',
        actsOnLabels: ["ignored"],
      }),
    ).toBe('acts_on "petrol vehicles" matches shift\'s FROM');
  });
});
