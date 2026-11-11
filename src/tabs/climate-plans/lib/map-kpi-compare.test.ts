import { describe, expect, it } from "vitest";
import {
  buildMapKpiCompareRows,
  buildTopTefCompareRows,
  compareDeltaTone,
  formatCompareDelta,
  formatMapKpiDisplay,
  mapKpiFamily,
} from "./map-kpi-compare";
import { mapKpiValue } from "./explore-aggregates";
import type { ExploreMunicipalityRecord, TefHit } from "./explore-types";
import type { Measure as MeasureRow } from "./measures-types";

function tefHit(
  stableId: string,
  shortLabel: string,
  extras: Partial<TefHit> = {},
): TefHit {
  return {
    stableId,
    shortLabel,
    sectorPath: "Transport > Road",
    group: "Transport",
    confidence: "high",
    measureText: shortLabel,
    description: shortLabel,
    source: "official",
    explicit: true,
    shiftFrom: "car",
    shiftTo: "bus",
    need: "mobility",
    shiftScore: 5,
    interventionWho: "municipality",
    interventionWhat: "bus",
    interventionHow: "procurement",
    interventionScore: 6,
    ...extras,
  };
}

function measure(): MeasureRow {
  return {
    measure_text: "Buy buses",
    activity: "road transport",
    activity_shift_score: 5,
    activity_shifts: [
      {
        activity: "commuting",
        shift_from: "car",
        shift_to: "bus",
        need: "mobility",
        type: "Type Shift",
        type_reasoning: "",
        score: 5,
        reasoning: "",
        transition_element_matches: [
          {
            stable_id: "t1",
            short_label: "T-1 - Bus",
            description: "Bus",
            sector_path: "Transport > Road",
            match_confidence: "high",
            explicit: true,
          },
        ],
        transition_element_candidates: [],
      },
    ],
    intervention_who: "municipality",
    intervention_when: "2026",
    intervention_what: "bus",
    intervention_how: "procurement",
    intervention_score: 6,
    intervention_reasoning: "",
    intervention_type: "direct",
  };
}

function record(
  partial: Partial<ExploreMunicipalityRecord>,
): ExploreMunicipalityRecord {
  return {
    id: "a",
    name: "Nässjö",
    regionName: "Jönköping",
    measures: [measure()],
    commitmentCount: 4,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: 3,
    climateCommitmentGroupCount: 2,
    adaptationCommitmentCount: 1,
    ownCommitmentCount: 2,
    companionReferenceCount: 0,
    markdownChars: 9000,
    tefHits: [],
    documentTitle: null,
    adoptedYear: 2024,
    sourceUrl: null,
    county: "Jönköping",
    dataSources: ["pipeline-commitments"],
    ...partial,
  };
}

describe("map KPI compare helpers", () => {
  it("formats KPI display values", () => {
    const row = record({});
    expect(
      formatMapKpiDisplay(mapKpiValue(row, "uniqueCommitments", null)),
    ).toBe("4");
    expect(
      formatMapKpiDisplay(mapKpiValue(row, "climateRelevantShare", null)),
    ).toBe("75%");
  });

  it("maps KPIs into deep-dive families", () => {
    expect(mapKpiFamily("uniqueCommitments")).toBe("commitments");
    expect(mapKpiFamily("avgInterventionScore")).toBe("measures");
    expect(mapKpiFamily("distinctTefs")).toBe("tef");
    expect(mapKpiFamily("planChars")).toBe("plan");
    expect(mapKpiFamily("emissionFocusGap")).toBe("emissions");
  });

  it("builds commitment-family rows with signed deltas", () => {
    const primary = record({
      name: "Nässjö",
      commitmentCount: 4,
      climateRelevantCommitmentCount: 3,
      markdownChars: 9000,
    });
    const compare = record({
      id: "b",
      name: "Vetlanda",
      commitmentCount: 7,
      climateRelevantCommitmentCount: 2,
      markdownChars: 12000,
      measures: [
        {
          ...measure(),
          activity_shift_score: 3,
          intervention_score: 4,
          intervention_who: "none",
          intervention_what: "none",
        },
      ],
    });

    const rows = buildMapKpiCompareRows(
      primary,
      compare,
      "uniqueCommitments",
      null,
    );
    expect(rows.map((r) => r.id)).toContain("climateGroups");
    expect(rows.map((r) => r.id)).not.toContain("avgShift");
    expect(rows.map((r) => r.id)).not.toContain("planLength");

    const commitments = rows.find((r) => r.id === "commitmentCount");
    expect(commitments?.primary).toBe("4");
    expect(commitments?.compare).toBe("7");
    expect(commitments?.delta).toBe(3);
    expect(formatCompareDelta(3, "count")).toBe("+3");
    expect(compareDeltaTone(3, true)).toBe("better");

    const climate = rows.find((r) => r.id === "climateRelevant");
    expect(climate?.delta).toBe(-1);
    expect(compareDeltaTone(-1, true)).toBe("worse");
  });

  it("builds measure-family rows instead of commitment stats", () => {
    const rows = buildMapKpiCompareRows(
      record({}),
      null,
      "avgInterventionScore",
      null,
    );
    expect(rows.map((r) => r.id)).toEqual(
      expect.arrayContaining([
        "selectedKpi",
        "measureCount",
        "avgIntervention",
        "whoWhat",
      ]),
    );
    expect(rows.map((r) => r.id)).not.toContain("commitmentCount");
  });

  it("builds plan-family rows with neutral plan length", () => {
    const primary = record({ markdownChars: 9000 });
    const compare = record({
      id: "b",
      name: "Vetlanda",
      markdownChars: 12000,
    });
    const rows = buildMapKpiCompareRows(primary, compare, "planChars", null);
    const planLength = rows.find((r) => r.id === "planLength");
    expect(planLength?.higherIsBetter).toBeNull();
    expect(compareDeltaTone(planLength?.delta ?? null, null)).toBe("neutral");
  });

  it("leaves compare cells empty when no compare place is set", () => {
    const rows = buildMapKpiCompareRows(
      record({}),
      null,
      "uniqueCommitments",
      null,
    );
    expect(rows.every((r) => r.compare == null)).toBe(true);
    expect(rows.every((r) => r.delta == null)).toBe(true);
  });

  it("formats share deltas in percentage points", () => {
    expect(formatCompareDelta(0.12, "share")).toBe("+12 pp");
    expect(formatCompareDelta(-0.05, "share")).toBe("−5 pp");
    expect(formatCompareDelta(0, "count")).toBe("±0");
  });

  it("unions each place's top TEFs with per-side hit counts", () => {
    const primaryHits = [
      tefHit("a", "T-1 - Rail"),
      tefHit("a", "T-1 - Rail"),
      tefHit("a", "T-1 - Rail"),
      tefHit("b", "T-2 - Steel"),
      tefHit("c", "T-3 - Heat"),
    ];
    const compareHits = [
      tefHit("b", "T-2 - Steel"),
      tefHit("b", "T-2 - Steel"),
      tefHit("b", "T-2 - Steel"),
      tefHit("b", "T-2 - Steel"),
      tefHit("d", "T-4 - Waste"),
      tefHit("d", "T-4 - Waste"),
      tefHit("e", "T-5 - Other"),
    ];

    // primary top-3: a,b,c · compare top-3: b,d,e · union sorted by max hits
    const rows = buildTopTefCompareRows(primaryHits, compareHits, 3);
    expect(rows.map((r) => r.stableId)).toEqual(["b", "a", "d", "c", "e"]);
    expect(rows[0]).toMatchObject({
      stableId: "b",
      primaryHits: 1,
      compareHits: 4,
      delta: 3,
    });
    expect(rows.find((r) => r.stableId === "a")).toMatchObject({
      primaryHits: 3,
      compareHits: null,
      delta: null,
    });
    expect(rows.find((r) => r.stableId === "d")).toMatchObject({
      primaryHits: null,
      compareHits: 2,
      delta: null,
    });
  });
});
