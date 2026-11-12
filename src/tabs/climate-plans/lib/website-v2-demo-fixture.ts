/**
 * Tiny local-only fixture for Website visuals v2 when APIs are unreachable.
 * Enable with `?view=website-v2&demo=1`.
 */

import type {
  ExploreMunicipalityRecord,
  SectorYearEmissions,
  TefHit,
} from "./explore-types";
import type { Measure } from "./measures-types";

function measure(
  partial: Partial<Measure> & Pick<Measure, "measure_text">,
): Measure {
  return {
    activity: "transport",
    activity_shift_score: 4,
    activity_shifts: [],
    intervention_who: "none",
    intervention_when: "none",
    intervention_what: "none",
    intervention_how: "none",
    intervention_score: 3,
    intervention_reasoning: "",
    intervention_type: "direct",
    ...partial,
  };
}

function hit(
  partial: Partial<TefHit> &
    Pick<TefHit, "stableId" | "measureText" | "explicit" | "shortLabel">,
): TefHit {
  return {
    sectorPath: "Transport > Mobility",
    group: "Transport",
    confidence: "high",
    description: "",
    source: "official",
    shiftFrom: "diesel",
    shiftTo: "ev",
    need: "mobility",
    shiftScore: 5,
    interventionWho: "",
    interventionWhat: "",
    interventionHow: "",
    interventionScore: 0,
    ...partial,
  };
}

function muni(
  name: string,
  measures: Measure[],
  tefHits: TefHit[],
): ExploreMunicipalityRecord {
  return {
    id: name.toLowerCase(),
    name,
    regionName: "Västerbotten",
    measures,
    commitmentCount: measures.length + 4,
    commitmentSource: "pipeline-commitments",
    climateRelevantCommitmentCount: measures.length + 2,
    climateCommitmentGroupCount: measures.length,
    adaptationCommitmentCount: 0,
    ownCommitmentCount: measures.length,
    companionReferenceCount: 1,
    markdownChars: 12000,
    tefHits,
    documentTitle: `Klimatplan ${name}`,
    adoptedYear: 2021,
    sourceUrl: null,
    county: "Västerbottens län",
    dataSources: [
      "pipeline-measures",
      "pipeline-commitments",
      "unearth-sector-emissions",
    ],
  };
}

export const WEBSITE_V2_DEMO_RECORDS: ExploreMunicipalityRecord[] = [
  muni(
    "Umeå",
    [
      measure({
        measure_text: "Buy electric buses for the city fleet",
        intervention_who: "Tekniska nämnden",
        intervention_what: "Replace diesel buses with electric",
        intervention_when: "2027",
        intervention_how: "Public procurement",
      }),
      measure({
        measure_text: "Promote sustainable travel",
        intervention_who: "municipality",
        intervention_what: "campaign",
        intervention_when: "none",
        intervention_how: "none",
      }),
      measure({
        measure_text: "Build a district heating connection in Tomtebo",
        intervention_who: "Umeå Energi",
        intervention_what: "Extend district heating network",
        intervention_when: "2025–2026",
        intervention_how: "Investment programme",
      }),
    ],
    [
      hit({
        stableId: "bus",
        measureText: "Buy electric buses for the city fleet",
        explicit: true,
        shortLabel: "T-1A1b-TE-1 - Electric buses",
      }),
      hit({
        stableId: "travel",
        measureText: "Promote sustainable travel",
        explicit: false,
        shortLabel: "T-1A2a-TE-3 - Modal shift campaigns",
      }),
      hit({
        stableId: "heat",
        measureText: "Build a district heating connection in Tomtebo",
        explicit: true,
        shortLabel: "T-5A1a-TE-2 - District heating expansion",
        group: "Energy",
        sectorPath: "Energy > Heat",
        source: "official",
      }),
      hit({
        stableId: "ste-demo",
        measureText: "Build a district heating connection in Tomtebo",
        explicit: true,
        shortLabel: "STE-42 - Low-temperature heat networks",
        group: "Energy",
        sectorPath: "Shadow Proposals > Heat",
        source: "proposed",
      }),
    ],
  ),
  muni(
    "Skellefteå",
    [
      measure({
        measure_text: "Investigate battery storage at industrial sites",
        intervention_who: "kommunen",
        intervention_what: "Feasibility study for storage",
        intervention_when: "under the plan period",
        intervention_how: "none",
      }),
      measure({
        measure_text: "Reduce transport emissions",
        intervention_what: "work toward fossil-free transport",
      }),
    ],
    [
      hit({
        stableId: "battery",
        measureText: "Investigate battery storage at industrial sites",
        explicit: false,
        shortLabel: "T-5A3a-TE-1 - Grid-scale storage",
        group: "Energy",
        sectorPath: "Energy > Storage",
      }),
      hit({
        stableId: "trans",
        measureText: "Reduce transport emissions",
        explicit: false,
        shortLabel: "T-1A1a-TE-2 - Fossil-free vehicle fleets",
      }),
    ],
  ),
  muni(
    "Lycksele",
    [
      measure({
        measure_text: "Adopt a municipal climate budget",
        intervention_who: "Kommunstyrelsen",
        intervention_what: "Adopt annual climate budget",
        intervention_when: "2024",
        intervention_how: "Council decision",
      }),
    ],
    [],
  ),
];

export const WEBSITE_V2_DEMO_EMISSIONS: SectorYearEmissions[] = [
  {
    municipalityName: "Umeå",
    byYear: {
      "2023": {
        Transporter: 120_000,
        Energi: 40_000,
        Jordbruk: 15_000,
        Industri: 25_000,
        Avfall: 8_000,
        "Egen uppvärmning": 18_000,
      },
    },
  },
  {
    municipalityName: "Skellefteå",
    byYear: {
      "2023": {
        Industri: 90_000,
        Transporter: 55_000,
        Energi: 30_000,
        Jordbruk: 12_000,
      },
    },
  },
  {
    municipalityName: "Lycksele",
    byYear: {
      "2023": {
        Jordbruk: 22_000,
        Transporter: 18_000,
        Energi: 9_000,
      },
    },
  },
];
