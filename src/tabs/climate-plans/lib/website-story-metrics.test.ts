import { describe, expect, it } from "vitest";
import {
  buildClimatePlansStoryMetrics,
  buildStoryPlaceMetrics,
} from "./website-story-metrics";
import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
} from "./explore-types";
import type { Measure } from "./measures-types";

function measureWithGate(domain: string, text: string): Measure {
  return {
    measure_text: text,
    activity: domain.toLowerCase(),
    activity_shift_score: 4,
    activity_shifts: [
      {
        activity: domain.toLowerCase(),
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
    documentTitle: "Klimatplan",
    adoptedYear: 2019,
    sourceUrl: null,
    county: "Västerbottens län",
    dataSources: ["pipeline-measures"],
    ...partial,
  };
}

describe("website story metrics", () => {
  const emissions: SectorYearEmissions[] = [
    {
      municipalityName: "Bjurholm",
      byYear: {
        "2019": { Transporter: 40, Jordbruk: 60 },
        "2021": { Transporter: 38, Jordbruk: 58 },
        "2023": { Transporter: 36, Jordbruk: 55 },
      },
    },
    {
      municipalityName: "Umeå",
      byYear: {
        "2021": { Transporter: 100, Jordbruk: 20 },
        "2022": { Transporter: 95, Jordbruk: 19 },
        "2023": { Transporter: 90, Jordbruk: 18 },
      },
    },
  ];

  it("builds national rollups and seven+ sector cells including Other", () => {
    const records = [
      record({
        id: "bjurholm",
        name: "Bjurholm",
        measures: [measureWithGate("Transport", "Bus routes")],
      }),
      record({
        id: "umea",
        name: "Umeå",
        adoptedYear: 2021,
        measures: [
          measureWithGate("Transport", "EV fleet"),
          measureWithGate("Energy", "District heat"),
          {
            ...measureWithGate("Transport", "Procurement rules"),
            activity_shifts: [],
          },
        ],
      }),
    ];
    const story = buildClimatePlansStoryMetrics(records, emissions);
    expect(story).not.toBeNull();
    expect(story!.municipalityCount).toBe(2);
    expect(story!.sectorCells).toHaveLength(7);
    expect(story!.sectorCells.some((c) => c.id === "other")).toBe(true);
    expect(story!.nationalInsights.length).toBeGreaterThan(0);
    expect(story!.places).toHaveLength(2);
  });

  it("marks biggest-source miss when agriculture dominates and only transport is covered", () => {
    const place = buildStoryPlaceMetrics(
      record({
        id: "bjurholm",
        name: "Bjurholm",
        measures: [measureWithGate("Transport", "Bus")],
      }),
      emissions,
    );
    expect(place.gap.focusMatch).toBe("miss");
    expect(place.plainFocus.shortLabel).toBe("Not really");
    expect(place.sectors.find((s) => s.id === "transport")?.addressed).toBe(
      true,
    );
    expect(place.sectors.find((s) => s.id === "afolu")?.addressed).toBe(false);
  });

  it("returns null for empty extracts (no fixture fallback)", () => {
    expect(buildClimatePlansStoryMetrics([], emissions)).toBeNull();
  });
});
