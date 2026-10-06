import type {
  MatchConfidence,
  Measure,
  MunicipalityMeasures,
} from "./measures-types";
import type { EmissionBucket } from "./tef-groups";

export type ExploreDataSource =
  | "static-measures"
  | "pipeline-measures"
  | "pipeline-commitments"
  | "pipeline-markdown"
  | "static-emission-targets"
  | "static-plan-scope"
  | "municipality-sources"
  | "unearth-sector-emissions";

export interface TefHit {
  stableId: string;
  shortLabel: string;
  sectorPath: string;
  group: string;
  confidence: MatchConfidence;
  measureText: string;
}

export interface QuantifiedGoal {
  description: string;
  reductionPercent: number | null;
  baselineYear: number | null;
  targetYear: number | null;
  scope: string;
  sector: string;
  commitmentStrength: string;
  goalType: string;
  sourceQuote: string;
}

export interface ExploreMunicipalityRecord {
  id: string;
  name: string;
  regionName: string | null;
  measures: Measure[];
  commitmentCount: number;
  commitmentSource: "pipeline-commitments" | "measures-as-proxy";
  climateRelevantCommitmentCount: number | null;
  markdownChars: number | null;
  tefHits: TefHit[];
  goals: QuantifiedGoal[];
  hasQuantifiedTargets: boolean | null;
  parisMentioned: boolean | null;
  onePointFiveMentioned: boolean | null;
  carbonBudgetReferenced: boolean | null;
  documentTitle: string | null;
  documentType: string | null;
  adoptionDate: string | null;
  planPeriodStart: string | null;
  planPeriodEnd: string | null;
  primaryFocus: string | null;
  adoptedYear: number | null;
  sourceUrl: string | null;
  county: string | null;
  dataSources: ExploreDataSource[];
}

export interface SectorYearEmissions {
  municipalityName: string;
  /** year -> sector label -> tonnes CO2e */
  byYear: Record<string, Record<string, number>>;
}

export interface ExploreDataset {
  municipalities: ExploreMunicipalityRecord[];
  measuresOnly: MunicipalityMeasures[];
  sectorEmissions: SectorYearEmissions[];
  sectorEmissionsError: string | null;
}

export interface TefGroupStrength {
  group: string;
  hitCount: number;
  uniqueTefCount: number;
  uniqueMeasureCount: number;
  weightedStrength: number;
  highShare: number;
}

export interface AlignmentRow {
  bucket: EmissionBucket;
  emissionShare: number;
  tefShare: number;
  gap: number;
}

export type MapKpiId =
  | "uniqueCommitments"
  | "goalCount"
  | "quantifiedGoalCount"
  | "distinctTefs"
  | "distinctTefGroups"
  | "tefGroupStrength"
  | "avgInterventionScore"
  | "avgActivityShiftScore"
  | "planChars"
  | "hasQuantifiedTargets"
  | "parisMentioned"
  | "climateRelevantShare";

export type ExploreViewId = "map" | "alignment" | "goals" | "tef" | "anatomy";
export type ClimatePlansTabId = "measures" | "taxonomy" | "explore";
export type MapGeoLevel = "municipality" | "region";
export type EmissionsYearMode = "latest" | "plan";
