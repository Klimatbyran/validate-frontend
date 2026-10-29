import type {
  MatchConfidence,
  Measure,
  MunicipalityMeasures,
} from "./measures-types";

export type ExploreDataSource =
  | "pipeline-measures"
  | "pipeline-commitments"
  | "pipeline-markdown"
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
  /**
   * Whether the measure's own text directly names this TEF (explicit) vs only a
   * reasonable inference (implied). Undefined on matches made before this field
   * existed (older pipeline runs).
   */
  explicit?: boolean;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  shiftScore: number;
  interventionWho: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
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
  /** Commitments with adaptation === true. Null without pipeline commitments. */
  adaptationCommitmentCount: number | null;
  /** Commitments with empty originatesFrom (municipality's own). Null without pipeline. */
  ownCommitmentCount: number | null;
  /** Deduped companion DocumentReference groups. Null when plan extras not loaded. */
  companionReferenceCount: number | null;
  /**
   * ClimatePlan.status === APPROVED (municipality-name match approved).
   * Null when plan extras not loaded.
   */
  planApproved: boolean | null;
  markdownChars: number | null;
  tefHits: TefHit[];
  documentTitle: string | null;
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

export interface PipelineCommitment {
  text: string;
  climateRelevant: boolean | null;
  actionable: boolean | null;
  similarGroupId: string | null;
  adaptation: boolean | null;
  originatesFrom: string[];
}

export type MapKpiId =
  | "uniqueCommitments"
  | "climateRelevantCommitments"
  | "climateCommitmentGroups"
  | "distinctTefs"
  | "distinctTefGroups"
  | "tefGroupStrength"
  | "avgInterventionScore"
  | "avgActivityShiftScore"
  | "planChars"
  | "climateRelevantShare"
  | "measureCount"
  | "interventionActiveShare"
  | "interventionSpecificityShare"
  | "highInterventionShare"
  | "highActivityShiftShare"
  | "adaptationShare"
  | "ownCommitmentShare"
  | "explicitTefShare"
  | "tefMatchRate"
  | "shadowHitCount"
  | "companionReferenceCount"
  | "planApproved";

export type ExploreViewId = "map" | "shifts" | "tef-framework" | "anatomy";
export type ClimatePlansTabId = "explore" | "measures" | "taxonomy";
export type MapGeoLevel = "municipality" | "region";
export type TefFrameworkScope = "all" | "municipality" | "region";
export type TefFrameworkMetric = "hits" | "strength" | "municipalities";
/** 3d = emission-scaled sector pillars (default); grid = catalogue heatmap. */
export type TefFrameworkLayout = "3d" | "grid";
/** How 3d pillar height is scaled. */
export type TefFrameworkHeightMode = "share" | "tonnes";
export type ShiftsLayoutId = "compare" | "flows" | "types";
