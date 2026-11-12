import { describe, expect, it } from "vitest";
import { exploreApiPlanToRecord } from "./explore-plans-api";
import type { ExploreApiPlanRow } from "./explore-plans-api";

function samplePlan(
  partial: Partial<ExploreApiPlanRow> = {},
): ExploreApiPlanRow {
  return {
    id: "plan-1",
    name: "Umeå",
    municipalityId: "muni-1",
    regionName: "Västerbotten",
    county: "Västerbottens län",
    status: "APPROVED",
    documentTitle: "Klimatplan",
    adoptedYear: 2021,
    adoptedAt: null,
    sourceUrl: "https://example.test/plan",
    markdownChars: 1000,
    companionReferenceCount: 0,
    commitmentCount: 1,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 1,
    climateCommitmentGroupCount: 1,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: 1,
    commitments: [
      {
        text: "Buy electric buses",
        climateRelevant: true,
        actionable: true,
        similarGroupId: "g1",
        adaptation: false,
        originatesFrom: [],
      },
    ],
    measures: [
      {
        measure_text: "Buy electric buses",
        activity: "transport",
        activity_shift_score: 5,
        activity_shifts: [
          {
            activity: "mobility",
            shift_from: "diesel",
            shift_to: "ev",
            need: "mobility",
            type: "Type Shift",
            type_reasoning: "",
            score: 5,
            reasoning: "",
            transition_element_matches: [
              {
                stable_id: "bus",
                short_label: "T-1A1b-TE-1 - Electric buses",
                description: "",
                sector_path: "Transport > Mobility",
                match_confidence: "high",
                explicit: true,
              },
            ],
            transition_element_candidates: [],
          },
        ],
        intervention_who: "Tekniska nämnden",
        intervention_when: "2027",
        intervention_what: "fleet",
        intervention_how: "procurement",
        intervention_score: 5,
        intervention_reasoning: "",
        intervention_type: "direct",
      },
    ],
    dataSources: ["pipeline-measures", "pipeline-commitments"],
    ...partial,
  };
}

describe("exploreApiPlanToRecord", () => {
  it("maps API rows into ExploreMunicipalityRecord with TEF hits", () => {
    const record = exploreApiPlanToRecord(samplePlan());
    expect(record.name).toBe("Umeå");
    expect(record.measures).toHaveLength(1);
    expect(record.tefHits).toHaveLength(1);
    expect(record.tefHits[0]?.explicit).toBe(true);
    expect(record.climateCommitmentGroupCount).toBe(1);
    expect(record.dataSources).toContain("pipeline-measures");
  });

  it("nulls climate commitment KPIs for measures-as-proxy and proxies count", () => {
    const record = exploreApiPlanToRecord(
      samplePlan({
        commitmentSource: "measures-as-proxy",
        commitmentCount: 0,
        climateRelevantCommitmentCount: 0,
        climateCommitmentGroupCount: 0,
        adaptationCommitmentCount: 0,
        ownCommitmentCount: 0,
        commitments: [],
      }),
    );
    expect(record.commitmentCount).toBe(1);
    expect(record.commitmentSource).toBe("measures-as-proxy");
    expect(record.climateRelevantCommitmentCount).toBeNull();
    expect(record.climateCommitmentGroupCount).toBeNull();
    expect(record.adaptationCommitmentCount).toBeNull();
    expect(record.ownCommitmentCount).toBeNull();
  });
});
