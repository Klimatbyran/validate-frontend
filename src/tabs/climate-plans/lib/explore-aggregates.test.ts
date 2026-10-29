import { describe, expect, it } from "vitest";
import {
  foldPlaceName,
  foldRegionName,
  namesMatch,
} from "./municipality-names";
import {
  collectTefHits,
  countAdaptationCommitments,
  countClimateCommitmentGroups,
  countOwnCommitments,
  explicitTefShare,
  highScoreShare,
  interventionActiveShare,
  interventionSpecificityShare,
  mapKpiValue,
  mergeRegionRecords,
  shadowHitCount,
  tefGroupStrengths,
  tefMatchRate,
  topTefsByHitCount,
} from "./explore-aggregates";
import {
  emissionBucketForTefGroup,
  tefGroupFromSectorPath,
} from "./tef-groups";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure as MeasureRow } from "./measures-types";

function measureWithTef(
  groupPath: string,
  confidence: "high" | "mid" | "low",
  explicit?: boolean,
): MeasureRow {
  return {
    measure_text: `Measure ${groupPath} ${confidence}`,
    activity: "road transport",
    activity_shift_score: 4,
    activity_shifts: [
      {
        activity: "commuting",
        shift_from: "car",
        shift_to: "train",
        need: "mobility",
        type: "Type Shift",
        type_reasoning: "",
        score: 4,
        reasoning: "",
        transition_element_matches: [
          {
            stable_id: `${groupPath}-${confidence}`,
            short_label: "Shift",
            description: `TEF for ${groupPath}`,
            sector_path: groupPath,
            match_confidence: confidence,
            ...(typeof explicit === "boolean" ? { explicit } : {}),
          },
        ],
        transition_element_candidates: [],
      },
    ],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "bus",
    intervention_how: "procurement",
    intervention_score: 5,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "nassjo",
    name: "Nässjö",
    regionName: "Jönköping",
    measures: [],
    commitmentCount: 4,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 3,
    climateCommitmentGroupCount: 2,
    adaptationCommitmentCount: 1,
    ownCommitmentCount: 3,
    companionReferenceCount: 1,
    markdownChars: 12000,
    tefHits: [],
    documentTitle: "Strategi",
    adoptedYear: 2024,
    sourceUrl: "https://example.test",
    county: "Jönköpings län",
    dataSources: ["pipeline-commitments"],
    ...partial,
  };
}

describe("municipality name folding", () => {
  it("matches diacritics and folder spellings", () => {
    expect(foldPlaceName("Nässjö")).toBe("nassjo");
    expect(namesMatch("Nässjö", "Nassjo")).toBe(true);
    expect(foldRegionName("Jönköpings län")).toBe("jonkoping");
    expect(namesMatch("Jönköpings län", "Jönköping")).toBe(true);
  });
});

describe("TEF grouping and strength", () => {
  it("uses the first sector_path segment", () => {
    expect(tefGroupFromSectorPath("Transport > Mobility > Road")).toBe(
      "Transport",
    );
    expect(emissionBucketForTefGroup("Transport")).toBe("transport");
  });

  it("weights high-confidence hits more strongly", () => {
    const measures: MeasureRow[] = [
      measureWithTef("Transport > Road", "high"),
      measureWithTef("Transport > Road", "low"),
    ];
    const strengths = tefGroupStrengths(collectTefHits(measures));
    expect(strengths[0]?.group).toBe("Transport");
    expect(strengths[0]?.weightedStrength).toBeCloseTo((3 + 1) / 6);
  });

  it("carries shift, intervention, and description on each hit", () => {
    const [hit] = collectTefHits([measureWithTef("Transport > Road", "high")]);
    expect(hit).toMatchObject({
      description: "TEF for Transport > Road",
      shiftFrom: "car",
      shiftTo: "train",
      need: "mobility",
      shiftScore: 4,
      interventionWho: "municipality",
      interventionWhat: "bus",
      interventionHow: "procurement",
      interventionScore: 5,
    });
    expect(hit?.explicit).toBeUndefined();
  });

  it("forwards explicit / implied judgment when present on the match", () => {
    const [implied] = collectTefHits([
      measureWithTef("Transport > Road", "mid", false),
    ]);
    const [explicit] = collectTefHits([
      measureWithTef("Transport > Road", "high", true),
    ]);
    expect(implied?.explicit).toBe(false);
    expect(explicit?.explicit).toBe(true);
  });
});

describe("map detail quality helpers", () => {
  it("measures who+what specificity share", () => {
    const filled = measureWithTef("Transport > Road", "high");
    const empty: MeasureRow = {
      ...filled,
      intervention_who: "none",
      intervention_what: "none",
    };
    expect(interventionSpecificityShare([filled, empty])).toBeCloseTo(0.5);
    expect(interventionSpecificityShare([])).toBeNull();
  });

  it("ranks top TEFs by hit count", () => {
    const [sample] = collectTefHits([
      measureWithTef("Transport > Road", "high"),
    ]);
    const ranked = topTefsByHitCount(
      [
        { ...sample!, stableId: "a", shortLabel: "T-1 - Rail" },
        { ...sample!, stableId: "a", shortLabel: "T-1 - Rail" },
        { ...sample!, stableId: "b", shortLabel: "T-2 - Steel" },
      ],
      2,
    );
    expect(ranked).toEqual([
      { stableId: "a", shortLabel: "T-1 - Rail", hitCount: 2 },
      { stableId: "b", shortLabel: "T-2 - Steel", hitCount: 1 },
    ]);
  });
});

describe("climate commitment groups", () => {
  it("collapses similarGroupId after climate and actionable filters", () => {
    expect(
      countClimateCommitmentGroups([
        {
          text: "a",
          climateRelevant: true,
          actionable: true,
          similarGroupId: "g1",
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "a-dup",
          climateRelevant: true,
          actionable: true,
          similarGroupId: "g1",
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "b",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "not-climate",
          climateRelevant: false,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "not-actionable",
          climateRelevant: true,
          actionable: false,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: [],
        },
      ]),
    ).toBe(2);
  });
});

describe("map KPIs", () => {
  it("returns commitment counts from live pipeline fields", () => {
    const row = record({});
    expect(mapKpiValue(row, "uniqueCommitments", null).numeric).toBe(4);
    expect(mapKpiValue(row, "climateRelevantCommitments", null).numeric).toBe(
      3,
    );
    expect(mapKpiValue(row, "climateCommitmentGroups", null).numeric).toBe(2);
    expect(mapKpiValue(row, "climateRelevantShare", null).numeric).toBeCloseTo(
      0.75,
    );
  });

  it("computes measure quality and TEF KPIs from scored measures", () => {
    const filled: MeasureRow = {
      ...measureWithTef("Transport > Road", "high", true),
      activity_shift_score: 6,
      intervention_score: 6,
    };
    const empty: MeasureRow = {
      ...filled,
      measure_text: "empty",
      intervention_who: "none",
      intervention_what: "none",
      intervention_type: "none",
      intervention_score: 2,
      activity_shift_score: 2,
      activity_shifts: [
        {
          ...filled.activity_shifts[0]!,
          transition_element_matches: [],
          shadow_element_id: "shadow-1",
        },
      ],
    };
    const measures = [filled, empty];
    expect(interventionActiveShare(measures)).toBeCloseTo(0.5);
    expect(highScoreShare(measures, "intervention_score")).toBeCloseTo(0.5);
    expect(highScoreShare(measures, "activity_shift_score")).toBeCloseTo(0.5);
    expect(tefMatchRate(measures)).toBeCloseTo(0.5);
    expect(shadowHitCount(measures)).toBe(1);
    expect(explicitTefShare(collectTefHits(measures))).toBe(1);

    const rejectedShadow: MeasureRow = {
      ...empty,
      measure_text: "rejected-shadow",
      activity_shifts: [
        {
          ...empty.activity_shifts[0]!,
          shadow_element_id: "shadow-rejected",
          shadow_element_status: "rejected",
        },
      ],
    };
    expect(shadowHitCount([...measures, rejectedShadow])).toBe(1);

    const row = record({ measures, tefHits: collectTefHits(measures) });
    expect(mapKpiValue(row, "measureCount", null).numeric).toBe(2);
    expect(
      mapKpiValue(row, "interventionActiveShare", null).numeric,
    ).toBeCloseTo(0.5);
    expect(
      mapKpiValue(row, "interventionSpecificityShare", null).numeric,
    ).toBeCloseTo(0.5);
    expect(mapKpiValue(row, "adaptationShare", null).numeric).toBeCloseTo(0.25);
    expect(mapKpiValue(row, "ownCommitmentShare", null).numeric).toBeCloseTo(
      0.75,
    );
    expect(mapKpiValue(row, "companionReferenceCount", null).numeric).toBe(1);
    expect(mapKpiValue(row, "shadowHitCount", null).numeric).toBe(1);
  });

  it("counts distinct adaptation and own commitment texts", () => {
    expect(
      countAdaptationCommitments([
        {
          text: "a",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: true,
          originatesFrom: [],
        },
        {
          text: "a",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: true,
          originatesFrom: [],
        },
        {
          text: "b",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: ["region"],
        },
      ]),
    ).toBe(1);
    expect(
      countOwnCommitments([
        {
          text: "a",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "a",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: [],
        },
        {
          text: "b",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
          adaptation: false,
          originatesFrom: ["eu"],
        },
      ]),
    ).toBe(1);
  });

  it("sums companion refs when merging region records", () => {
    const merged = mergeRegionRecords(
      [
        record({ name: "A", companionReferenceCount: 1 }),
        record({ name: "B", companionReferenceCount: 2 }),
      ],
      "Jönköping",
    );
    expect(merged.companionReferenceCount).toBe(3);
  });
});
