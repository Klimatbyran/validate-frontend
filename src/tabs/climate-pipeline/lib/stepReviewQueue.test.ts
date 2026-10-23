import { describe, expect, it } from "vitest";
import type {
  ClimatePlanDetail,
  Commitment,
  ExtractedMeasure,
} from "../hooks/useClimatePlanDetail";
import type { PipelineReview } from "../hooks/usePipelineReviews";
import { reviewKey } from "../hooks/usePipelineReviews";
import {
  buildStepReviewItems,
  filterByQaStatus,
  filterTeMatchesForListView,
  getStepReviewPrompt,
  matchesQaFilter,
  stepSupportsReviewMode,
  teUnmatchedEntityId,
} from "./stepReviewQueue";
import {
  activityShiftEntityKey,
  commitmentEntityId,
  teMatchEntityId,
} from "./stepReviewEntities";

function commitment(
  overrides: Partial<Commitment> & { stableId: string },
): Commitment {
  return {
    id: overrides.id ?? overrides.stableId,
    stableId: overrides.stableId,
    section: overrides.section ?? "§1",
    text: overrides.text ?? `Text for ${overrides.stableId}`,
    context: "",
    type: "TEXT",
    tableHeader: null,
    rowRaw: null,
    tableMetadata: null,
    unverified: false,
    extractionParts: null,
    fromRecoveredImage: false,
    originatesFrom: null,
    climateRelevant: overrides.climateRelevant ?? true,
    adaptation: overrides.adaptation ?? false,
    climateFilterReason: null,
    actionable: overrides.actionable ?? true,
    actionableReason: null,
    similarGroupId: overrides.similarGroupId ?? null,
    theme: overrides.theme ?? null,
  };
}

function measureWithTeMatches(matchCount: number): ExtractedMeasure {
  const matches =
    matchCount === 0
      ? []
      : Array.from({ length: matchCount }, (_, i) => ({
          stableId: `te-${i + 1}`,
          shortLabel: `Match ${i + 1}`,
          sectorPath: "Transport / Active",
          score: 0.9 - i * 0.1,
          matchConfidence: "high" as const,
          matchReasoning: "reason",
        }));
  return {
    id: "m1",
    measureText: "Shift commuting from car to bike",
    climateRelevanceScore: "high",
    score: {
      id: "s1",
      activity: "commuting",
      activityShiftScore: 5,
      interventionWho: "",
      interventionWhen: "",
      interventionWhat: "",
      interventionHow: "",
      interventionScore: 4,
      interventionReasoning: "",
      interventionType: "policy",
      activityShifts: [
        {
          id: "as1",
          activity: "commuting",
          shiftFrom: "car",
          shiftTo: "bike",
          need: "mobility",
          type: "Type Shift",
          typeReasoning: "mode change",
          score: 5,
          reasoning: "",
          transitionElementMatches: matches,
        },
      ],
    },
  };
}

function detail(partial: Partial<ClimatePlanDetail>): ClimatePlanDetail {
  return {
    id: "plan-1",
    url: "https://example.com/plan.pdf",
    status: "APPROVED",
    extractedMunicipalityName: "Test",
    documentTitle: null,
    documentDescription: null,
    adoptedAt: null,
    adoptedAtText: null,
    coveragePeriodStart: null,
    coveragePeriodEnd: null,
    coveragePeriodText: null,
    markdown: null,
    annotatedMarkdown: null,
    municipality: null,
    commitments: [],
    documentReferences: [],
    extractedMeasures: [],
    recoveredImages: [],
    reviews: [],
    ...partial,
  };
}

function review(
  partial: Pick<PipelineReview, "entityType" | "entityId" | "status"> &
    Partial<PipelineReview>,
): PipelineReview {
  return {
    id: partial.id ?? "r1",
    climatePlanId: "plan-1",
    step: partial.step ?? "extractCommitments",
    entityType: partial.entityType,
    entityId: partial.entityId,
    reviewedSnapshot: {},
    status: partial.status,
    comment: partial.comment ?? null,
    suggestedValue: null,
    reviewedBy: null,
    reviewedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("stepReviewQueue", () => {
  it("exposes prompts only for multi-item QA steps with controls", () => {
    expect(stepSupportsReviewMode("extractMunicipality")).toBe(false);
    expect(stepSupportsReviewMode("classifyActivityShiftTypes")).toBe(false);
    expect(getStepReviewPrompt("extractMunicipality")).toBeNull();
    expect(getStepReviewPrompt("matchTransitionElements")).toContain("TEF");
  });

  it("builds one review item per commitment for extractCommitments", () => {
    const items = buildStepReviewItems(
      "extractCommitments",
      detail({
        commitments: [
          commitment({ stableId: "C001" }),
          commitment({ stableId: "C002" }),
        ],
      }),
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "commitment",
      entityId: "C001",
      columns: "extract",
    });
  });

  it("builds one review item per theme group", () => {
    const items = buildStepReviewItems(
      "groupCommitmentsThemes",
      detail({
        commitments: [
          commitment({ stableId: "C001", theme: "adaptation" }),
          commitment({ stableId: "C002", theme: "adaptation" }),
          commitment({ stableId: "C003", theme: "transport" }),
        ],
      }),
    );
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.kind)).toEqual([
      "commitmentGroup",
      "commitmentGroup",
    ]);
    const adaptation = items.find(
      (i) => i.kind === "commitmentGroup" && i.groupLabel === "adaptation",
    );
    expect(
      adaptation?.kind === "commitmentGroup" && adaptation.commitments,
    ).toHaveLength(2);
  });

  it("builds similar duplicate groups and unique singletons", () => {
    const items = buildStepReviewItems(
      "groupCommitmentsSimilar",
      detail({
        commitments: [
          commitment({ stableId: "C001", similarGroupId: "g1" }),
          commitment({ stableId: "C002", similarGroupId: "g1" }),
          commitment({ stableId: "C003" }),
        ],
      }),
    );
    expect(items).toHaveLength(2);
    expect(
      items.filter(
        (i) =>
          i.kind === "commitmentGroup" && i.groupLabel === "Duplicate group",
      ),
    ).toHaveLength(1);
    expect(
      items.filter(
        (i) => i.kind === "commitmentGroup" && i.groupLabel === "Unique",
      ),
    ).toHaveLength(1);
  });

  it("filters theme groups by member review status", () => {
    const c1 = commitment({ stableId: "C001", theme: "adaptation" });
    const c2 = commitment({ stableId: "C002", theme: "adaptation" });
    const c3 = commitment({ stableId: "C003", theme: "transport" });
    const items = buildStepReviewItems(
      "groupCommitmentsThemes",
      detail({ commitments: [c1, c2, c3] }),
    );
    const reviews = new Map<string, PipelineReview>([
      [
        reviewKey("groupCommitmentsThemes", "commitment", "C001"),
        review({
          step: "groupCommitmentsThemes",
          entityType: "commitment",
          entityId: "C001",
          status: "OK",
        }),
      ],
      [
        reviewKey("groupCommitmentsThemes", "commitment", "C002"),
        review({
          step: "groupCommitmentsThemes",
          entityType: "commitment",
          entityId: "C002",
          status: "OK",
        }),
      ],
    ]);
    expect(
      filterByQaStatus(
        items,
        "groupCommitmentsThemes",
        reviews,
        "verified",
      ).map((i) => (i.kind === "commitmentGroup" ? i.groupLabel : i.entityId)),
    ).toEqual(["adaptation"]);
    expect(
      filterByQaStatus(
        items,
        "groupCommitmentsThemes",
        reviews,
        "not-reviewed",
      ).map((i) => (i.kind === "commitmentGroup" ? i.groupLabel : i.entityId)),
    ).toEqual(["transport"]);
  });

  it("filters actionable commitments before building the queue", () => {
    const items = buildStepReviewItems(
      "filterCommitmentsActionable",
      detail({
        commitments: [
          commitment({ stableId: "C001", climateRelevant: true }),
          commitment({ stableId: "C002", climateRelevant: false }),
        ],
      }),
    );
    expect(items.map((i) => i.entityId)).toEqual(["C001"]);
  });

  it("builds TE match items and unmatched shifts", () => {
    const withMatches = measureWithTeMatches(2);
    const unmatched = measureWithTeMatches(0);
    unmatched.id = "m2";
    unmatched.score!.activityShifts[0]!.shiftTo = "walk";
    const items = buildStepReviewItems(
      "matchTransitionElements",
      detail({ extractedMeasures: [withMatches, unmatched] }),
    );
    expect(items.filter((i) => i.kind === "teMatch")).toHaveLength(2);
    expect(items.filter((i) => i.kind === "teUnmatched")).toHaveLength(1);
    const shift = unmatched.score!.activityShifts[0]!;
    expect(items.find((i) => i.kind === "teUnmatched")?.entityId).toBe(
      teUnmatchedEntityId(shift),
    );
  });

  it("filters by QA status including ISSUE without comment", () => {
    const c1 = commitment({ stableId: "C001" });
    const c2 = commitment({ stableId: "C002" });
    const c3 = commitment({ stableId: "C003" });
    const c4 = commitment({ stableId: "C004" });
    const items = buildStepReviewItems(
      "extractCommitments",
      detail({ commitments: [c1, c2, c3, c4] }),
    );
    const reviews = new Map<string, PipelineReview>([
      [
        reviewKey("extractCommitments", "commitment", commitmentEntityId(c1)),
        review({
          step: "extractCommitments",
          entityType: "commitment",
          entityId: commitmentEntityId(c1),
          status: "OK",
        }),
      ],
      [
        reviewKey("extractCommitments", "commitment", commitmentEntityId(c2)),
        review({
          step: "extractCommitments",
          entityType: "commitment",
          entityId: commitmentEntityId(c2),
          status: "ISSUE",
          comment: "Wrong quote",
        }),
      ],
      [
        reviewKey("extractCommitments", "commitment", commitmentEntityId(c4)),
        review({
          step: "extractCommitments",
          entityType: "commitment",
          entityId: commitmentEntityId(c4),
          status: "SUGGESTED_FIX",
          comment: null,
        }),
      ],
    ]);

    expect(
      filterByQaStatus(items, "extractCommitments", reviews, "verified").map(
        (i) => i.entityId,
      ),
    ).toEqual(["C001"]);
    expect(
      filterByQaStatus(
        items,
        "extractCommitments",
        reviews,
        "with-comment",
      ).map((i) => i.entityId),
    ).toEqual(["C002", "C004"]);
    expect(
      filterByQaStatus(
        items,
        "extractCommitments",
        reviews,
        "not-reviewed",
      ).map((i) => i.entityId),
    ).toEqual(["C003"]);
  });

  it("matchesQaFilter treats OK+comment as both verified and with-comment", () => {
    const withComment = review({
      entityType: "commitment",
      entityId: "C001",
      status: "OK",
      comment: "looks good",
    });
    expect(matchesQaFilter(withComment, "verified")).toBe(true);
    expect(matchesQaFilter(withComment, "with-comment")).toBe(true);
  });

  it("keys TE match reviews with teMatchEntityId", () => {
    const m = measureWithTeMatches(1);
    const shift = m.score!.activityShifts[0]!;
    const match = shift.transitionElementMatches[0]!;
    const items = buildStepReviewItems(
      "matchTransitionElements",
      detail({ extractedMeasures: [m] }),
    );
    expect(items[0]?.entityId).toBe(teMatchEntityId(shift, match.stableId));
  });

  it("list TE filter keeps full matches on the shift and reports visibility", () => {
    const m = measureWithTeMatches(2);
    const shift = m.score!.activityShifts[0]!;
    const matchA = shift.transitionElementMatches[0]!;
    const reviews = new Map<string, PipelineReview>([
      [
        reviewKey(
          "matchTransitionElements",
          "teMatch",
          teMatchEntityId(shift, matchA.stableId),
        ),
        review({
          step: "matchTransitionElements",
          entityType: "teMatch",
          entityId: teMatchEntityId(shift, matchA.stableId),
          status: "OK",
        }),
      ],
    ]);

    const { measures, visibleMatchIdsByShiftKey } = filterTeMatchesForListView(
      [m],
      "matchTransitionElements",
      reviews,
      "verified",
    );
    expect(measures).toHaveLength(1);
    const kept = measures[0]!.score!.activityShifts[0]!;
    expect(kept.transitionElementMatches).toHaveLength(2);
    expect(
      visibleMatchIdsByShiftKey.get(activityShiftEntityKey(shift)),
    ).toEqual(new Set([matchA.stableId]));
  });

  it("includes unmatched shifts under not-reviewed list filter", () => {
    const unmatched = measureWithTeMatches(0);
    const { measures, visibleMatchIdsByShiftKey } = filterTeMatchesForListView(
      [unmatched],
      "matchTransitionElements",
      new Map(),
      "not-reviewed",
    );
    expect(measures).toHaveLength(1);
    const shift = unmatched.score!.activityShifts[0]!;
    expect(
      visibleMatchIdsByShiftKey.get(activityShiftEntityKey(shift))?.size,
    ).toBe(0);
  });
});
