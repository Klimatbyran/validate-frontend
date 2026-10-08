import { describe, expect, it } from "vitest";
import {
  foldPlaceName,
  foldRegionName,
  namesMatch,
} from "./municipality-names";
import {
  collectTefHits,
  countClimateCommitmentGroups,
  interventionSpecificityShare,
  mapKpiValue,
  tefGroupStrengths,
  topTefsByHitCount,
} from "./explore-aggregates";
import { alignmentRows } from "./explore-alignment";
import { trackGoal } from "./explore-goals";
import {
  emissionBucketForTefGroup,
  tefGroupFromSectorPath,
} from "./tef-groups";
import type { ExploreMunicipalityRecord } from "./explore-types";
import type { Measure as MeasureRow } from "./measures-types";

function measureWithTef(
  groupPath: string,
  confidence: "high" | "mid" | "low",
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
    markdownChars: 12000,
    tefHits: [],
    goals: [],
    hasQuantifiedTargets: true,
    parisMentioned: true,
    onePointFiveMentioned: true,
    carbonBudgetReferenced: true,
    documentTitle: "Strategi",
    documentType: "climate_strategy",
    adoptionDate: "2024-10-31",
    planPeriodStart: "2024",
    planPeriodEnd: "2045",
    primaryFocus: "mitigation",
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
        },
        {
          text: "a-dup",
          climateRelevant: true,
          actionable: true,
          similarGroupId: "g1",
        },
        {
          text: "b",
          climateRelevant: true,
          actionable: true,
          similarGroupId: null,
        },
        {
          text: "not-climate",
          climateRelevant: false,
          actionable: true,
          similarGroupId: null,
        },
        {
          text: "not-actionable",
          climateRelevant: true,
          actionable: false,
          similarGroupId: null,
        },
      ]),
    ).toBe(2);
  });
});

describe("map KPIs", () => {
  it("returns commitment count and boolean Paris flag", () => {
    const row = record({});
    expect(mapKpiValue(row, "uniqueCommitments", null).numeric).toBe(4);
    expect(mapKpiValue(row, "climateRelevantCommitments", null).numeric).toBe(
      3,
    );
    expect(mapKpiValue(row, "climateCommitmentGroups", null).numeric).toBe(2);
    expect(mapKpiValue(row, "parisMentioned", null).booleanValue).toBe(true);
    expect(mapKpiValue(row, "climateRelevantShare", null).numeric).toBeCloseTo(
      0.75,
    );
  });
});

describe("emissions vs TEF alignment", () => {
  it("flags transport-heavy emissions vs industry TEFs", () => {
    const row = record({
      tefHits: [
        {
          stableId: "wood-1",
          shortLabel: "Wood",
          sectorPath: "Industry > Wood",
          group: "Industry",
          confidence: "high",
          measureText: "bioeconomy",
          description: "",
          shiftFrom: "fossil",
          shiftTo: "bio",
          need: "materials",
          shiftScore: 4,
          interventionWho: "municipality",
          interventionWhat: "procurement",
          interventionHow: "policy",
          interventionScore: 5,
        },
      ],
      adoptedYear: 2022,
    });
    const { year, rows } = alignmentRows(
      row,
      {
        municipalityName: "Nässjö",
        byYear: {
          "2022": { Transporter: 80, Industri: 20 },
          "2023": { Transporter: 70, Industri: 30 },
        },
      },
      "latest",
    );
    expect(year).toBe("2023");
    const transport = rows.find((r) => r.bucket === "transport");
    const industry = rows.find((r) => r.bucket === "industry");
    expect(transport?.emissionShare).toBeCloseTo(0.7);
    expect(transport?.tefShare).toBe(0);
    expect(industry?.tefShare).toBe(1);
  });
});

describe("goal tracking", () => {
  it("marks a linear path off-track when emissions barely moved", () => {
    const result = trackGoal(
      {
        description: "50% by 2030",
        reductionPercent: 50,
        baselineYear: 2020,
        targetYear: 2030,
        scope: "geographic_area",
        sector: "",
        commitmentStrength: "adopted_goal",
        goalType: "emission_reduction",
        sourceQuote: "",
      },
      {
        municipalityName: "Nässjö",
        byYear: {
          "2020": { Transporter: 100 },
          "2025": { Transporter: 98 },
        },
      },
      2025,
    );
    expect(result.status).toBe("off-track");
    expect(result.expectedRemainingShare).toBeCloseTo(0.75);
    expect(result.actualRemainingShare).toBeCloseTo(0.98);
  });
});
