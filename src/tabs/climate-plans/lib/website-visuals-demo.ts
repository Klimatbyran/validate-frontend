/**
 * Tiny demo sample so Website visuals mocks render when explore APIs
 * are unreachable (local CORS / empty load). Not for public export.
 */

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

function baseRecord(
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
    markdownChars: 4000,
    tefHits: [],
    documentTitle: "Klimat- och energiplan",
    adoptedYear: 2019,
    sourceUrl: null,
    county: "Västerbottens län",
    dataSources: ["demo-fixture"],
    ...partial,
  };
}

export const WEBSITE_VISUALS_DEMO_RECORDS: ExploreMunicipalityRecord[] = [
  baseRecord({
    id: "demo-bjurholm",
    name: "Bjurholm",
    adoptedYear: 2018,
    measures: [
      measureWithGate("Transport", "Expand rural bus routes"),
      measureWithGate("Transport", "Shift municipal fleet to electric"),
      measureWithGate("Buildings", "Energy retrofit municipal buildings"),
    ],
    tefHits: Array.from({ length: 6 }, (_, i) => ({
      stableId: `demo-t-${i}`,
      shortLabel: "T-1A1a-TE-1 - Shift to electric cars",
      sectorPath: "Transport > Mobility > Road",
      group: "Transport",
      confidence: "high" as const,
      measureText: `EV measure ${i}`,
      description: "",
      source: "official" as const,
      explicit: true,
      shiftFrom: "petrol",
      shiftTo: "ev",
      need: "mobility",
      shiftScore: 5,
      interventionWho: "municipality",
      interventionWhat: "fleet",
      interventionHow: "procurement",
      interventionScore: 5,
    })),
  }),
  baseRecord({
    id: "demo-umea",
    name: "Umeå",
    adoptedYear: 2021,
    measures: [
      measureWithGate("Transport", "Congestion-aware parking"),
      measureWithGate("Energy", "District heating expansion"),
      measureWithGate("Industry", "Support process electrification"),
      measureWithGate("Waste", "Increase food-waste collection"),
      measureWithGate("AFOLU", "Support local food systems"),
      measureWithGate("Buildings", "Near-zero new builds"),
    ],
  }),
  baseRecord({
    id: "demo-skelleftea",
    name: "Skellefteå",
    adoptedYear: 2020,
    regionName: "Västerbotten",
    measures: [
      measureWithGate("Energy", "Wind power partnerships"),
      measureWithGate("Industry", "Green industry dialogue"),
      measureWithGate("Transport", "Freight shift to rail"),
    ],
  }),
  baseRecord({
    id: "demo-lycksele",
    name: "Lycksele",
    adoptedYear: 2017,
    measures: [measureWithGate("Transport", "School bus electrification")],
  }),
];

export const WEBSITE_VISUALS_DEMO_EMISSIONS: SectorYearEmissions[] = [
  {
    municipalityName: "Bjurholm",
    byYear: {
      "2019": {
        Transporter: 42,
        Jordbruk: 55,
        El_och_fjarrvarme: 12,
        Industri: 8,
        Avfall: 4,
        Egen_uppvärmning: 10,
      },
      "2021": {
        Transporter: 40,
        Jordbruk: 54,
        El_och_fjarrvarme: 11,
        Industri: 8,
        Avfall: 4,
        Egen_uppvärmning: 9,
      },
      "2023": {
        Transporter: 38,
        Jordbruk: 52,
        El_och_fjarrvarme: 10,
        Industri: 7,
        Avfall: 4,
        Egen_uppvärmning: 9,
      },
    },
  },
  {
    municipalityName: "Umeå",
    byYear: {
      "2021": {
        Transporter: 180,
        Jordbruk: 40,
        El_och_fjarrvarme: 90,
        Industri: 70,
        Avfall: 20,
        Egen_uppvärmning: 35,
      },
      "2022": {
        Transporter: 175,
        Jordbruk: 39,
        El_och_fjarrvarme: 85,
        Industri: 68,
        Avfall: 19,
        Egen_uppvärmning: 34,
      },
      "2023": {
        Transporter: 170,
        Jordbruk: 38,
        El_och_fjarrvarme: 80,
        Industri: 65,
        Avfall: 18,
        Egen_uppvärmning: 33,
      },
    },
  },
  {
    municipalityName: "Skellefteå",
    byYear: {
      "2020": {
        Transporter: 90,
        Jordbruk: 45,
        El_och_fjarrvarme: 60,
        Industri: 110,
        Avfall: 12,
        Egen_uppvärmning: 22,
      },
      "2021": {
        Transporter: 88,
        Jordbruk: 44,
        El_och_fjarrvarme: 58,
        Industri: 120,
        Avfall: 12,
        Egen_uppvärmning: 21,
      },
      "2023": {
        Transporter: 85,
        Jordbruk: 43,
        El_och_fjarrvarme: 55,
        Industri: 130,
        Avfall: 11,
        Egen_uppvärmning: 20,
      },
    },
  },
  {
    municipalityName: "Lycksele",
    byYear: {
      "2018": {
        Transporter: 50,
        Jordbruk: 70,
        El_och_fjarrvarme: 15,
        Industri: 20,
        Avfall: 5,
        Egen_uppvärmning: 12,
      },
      "2020": {
        Transporter: 52,
        Jordbruk: 72,
        El_och_fjarrvarme: 14,
        Industri: 21,
        Avfall: 5,
        Egen_uppvärmning: 11,
      },
      "2023": {
        Transporter: 55,
        Jordbruk: 74,
        El_och_fjarrvarme: 13,
        Industri: 22,
        Avfall: 5,
        Egen_uppvärmning: 11,
      },
    },
  },
];
