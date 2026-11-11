import { describe, expect, it } from "vitest";
import {
  buildPlaceKpiBundle,
  buildRegionKpiBundles,
  formatGapPercent,
  gapValueClass,
  rankByGap,
} from "./website-visuals-rollup";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "./explore-types";
import type { Measure } from "./measures-types";

function measureWithGate(domain: string): Measure {
  return {
    measure_text: `${domain} measure`,
    activity: domain,
    activity_shift_score: 4,
    activity_shifts: [
      {
        activity: domain,
        shift_from: "a",
        shift_to: "b",
        need: "n",
        type: "Type Shift",
        type_reasoning: "",
        score: 4,
        reasoning: "",
        transition_element_matches: [],
        transition_element_candidates: [],
        transition_element_gate_domain: domain,
      },
    ],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "action",
    intervention_how: "policy",
    intervention_score: 4,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord> &
    Pick<ExploreMunicipalityRecord, "id" | "name">,
): ExploreMunicipalityRecord {
  return {
    regionName: "Västerbotten",
    measures: [],
    commitmentCount: 0,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 0,
    climateCommitmentGroupCount: 0,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: 0,
    companionReferenceCount: 0,
    markdownChars: 1000,
    tefHits: [],
    documentTitle: null,
    adoptedYear: 2020,
    sourceUrl: null,
    county: "Västerbottens län",
    dataSources: ["pipeline-measures"],
    ...partial,
  };
}

describe("website visuals rollup", () => {
  it("formats gap classes and ranks best/worst", () => {
    expect(formatGapPercent(0.42)).toBe("42%");
    expect(gapValueClass(null)).toContain("gray");
    expect(gapValueClass(0.1)).toContain("blue");
    expect(gapValueClass(0.5)).toContain("pink");

    const emissions: SectorYearEmissions[] = [
      {
        municipalityName: "A",
        byYear: { "2024": { Transporter: 100 } },
      },
      {
        municipalityName: "B",
        byYear: { "2024": { Transporter: 20, Jordbruk: 80 } },
      },
    ];
    const a = buildPlaceKpiBundle(
      record({
        id: "a",
        name: "A",
        measures: [measureWithGate("Transport")],
      }),
      emissions,
    );
    const b = buildPlaceKpiBundle(
      record({
        id: "b",
        name: "B",
        measures: [measureWithGate("Transport")],
      }),
      emissions,
    );
    expect(rankByGap([a, b], "best")[0]?.record.name).toBe("A");
    expect(rankByGap([a, b], "worst")[0]?.record.name).toBe("B");
  });

  it("builds region bundles with coverage counts", () => {
    const emissions: SectorYearEmissions[] = [
      {
        municipalityName: "A",
        byYear: { "2024": { Transporter: 50 } },
      },
      {
        municipalityName: "B",
        byYear: { "2024": { Transporter: 50 } },
      },
    ];
    const regions = buildRegionKpiBundles(
      [
        record({
          id: "a",
          name: "A",
          measures: [measureWithGate("Transport")],
        }),
        record({
          id: "b",
          name: "B",
          measures: [measureWithGate("Transport")],
        }),
      ],
      emissions,
    );
    expect(regions).toHaveLength(1);
    expect(regions[0]?.municipalityCount).toBe(2);
    expect(regions[0]?.assessedCount).toBe(2);
  });
});
