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
  /** Taxonomy match description when present. */
  description: string;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  shiftScore: number;
  interventionWho: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
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
  /** Unique similar-groups after climate + actionable filters. Null without pipeline commitments. */
  climateCommitmentGroupCount: number | null;
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

export interface PipelineCommitment {
  text: string;
  climateRelevant: boolean | null;
  actionable: boolean | null;
  similarGroupId: string | null;
}

export type MapKpiId =
  | "uniqueCommitments"
  | "climateRelevantCommitments"
  | "climateCommitmentGroups"
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

export type ExploreViewId =
  | "map"
  | "alignment"
  | "goals"
  | "tef"
  | "tef-framework"
  | "anatomy";
export type ClimatePlansTabId = "measures" | "taxonomy" | "explore";
export type MapGeoLevel = "municipality" | "region";
export type EmissionsYearMode = "latest" | "plan";
export type TefFrameworkScope = "all" | "municipality" | "region";
export type TefFrameworkMetric = "hits" | "strength" | "municipalities";
