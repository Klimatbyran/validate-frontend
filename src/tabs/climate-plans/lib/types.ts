// Types for climate plan JSON data

export interface PolicyDomain {
  primary_focus: string;
  mitigation_sections: string[];
  adaptation_sections: string[];
  mitigation_description: string;
  adaptation_description: string;
  source_quotes: string[];
}

export interface SpatialScope {
  primary_scope: string;
  limited_to_territory: boolean;
  addresses_metropolitan_or_regional: boolean;
  metropolitan_regional_description: string;
  distinguishes_operations_vs_territory: boolean;
  operations_vs_territory_description: string;
  source_quotes: string[];
}

export interface TemporalScope {
  plan_period_start: string;
  plan_period_end: string;
  has_revision_cycle: boolean;
  revision_cycle_description: string;
  interim_milestones: string[];
  source_quotes: string[];
}

export interface PlanScopeSummary {
  document_type: string;
  document_title: string;
  adopting_body: string;
  adoption_date: string;
  overall_assessment: string;
}

export interface PlanScopeData {
  policy_domain: PolicyDomain;
  spatial_scope: SpatialScope;
  temporal_scope: TemporalScope;
  summary: PlanScopeSummary;
}

export interface OwnCommitment {
  goal_description: string;
  reduction_percentage: string;
  absolute_target: string;
  annual_reduction_rate: string;
  baseline_year: string;
  target_year: string;
  scope: string;
  scope_other: string;
  sector: string;
  source_quote: string;
  commitment_strength: string;
  commitment_strength_other: string;
  goal_type: string;
  ghg_scopes_explicit: string[];
  ghg_scopes_implicit: string[];
}

export interface ExternalReference {
  reference_description: string;
  source_organization: string;
  target_value: string;
  source_quote: string;
}

export interface PrimaryTarget {
  exists: boolean;
  reduction_percentage: string;
  baseline_year: string;
  target_year: string;
  scope: string;
  source_quote: string;
  confidence: string;
}

export interface EmissionsAccounting {
  accounting_type: string;
  accounting_type_other: string;
  includes_consumption_based: boolean;
  methodology_described: boolean;
  methodology_reference: string;
  methodology_notes: string;
  source_quotes: string[];
}

export interface FrameworkAlignment {
  paris_agreement_mentioned: boolean;
  one_point_five_mentioned: boolean;
  carbon_budget_referenced: boolean;
  carbon_budget_description: string;
  swedish_climate_act_referenced: boolean;
  swedish_national_targets_referenced: boolean;
  eu_frameworks_referenced: boolean;
  eu_frameworks_named: string[];
  alignment_character: string;
  alignment_character_other: string;
  alignment_justification: string;
  source_quotes: string[];
}

export interface EmissionTargetsSummary {
  document_publication_year: string;
  has_quantified_targets: boolean;
  has_clear_baseline: boolean;
  has_clear_timeline: boolean;
  scope_clarity: string;
  sectoral_targets_consistent: string;
  sectoral_consistency_notes: string;
  ghg_scopes_explicit: string[];
  ghg_scopes_implicit: string[];
  ghg_scope_notes: string;
  overall_assessment: string;
}

export interface EmissionTargetsData {
  own_commitments: OwnCommitment[];
  external_references: ExternalReference[];
  primary_target: PrimaryTarget;
  emissions_accounting: EmissionsAccounting;
  framework_alignment: FrameworkAlignment;
  summary: EmissionTargetsSummary;
}

export interface MunicipalityManifestEntry {
  id: string;
  name: string;
  folder: string;
  files: {
    plan_scope?: string;
    emission_targets?: string;
  };
}

export interface ClimatePlanIndex {
  municipalities: MunicipalityManifestEntry[];
}

export interface MunicipalityClimatePlan {
  id: string;
  name: string;
  planScope: PlanScopeData | null;
  emissionTargets: EmissionTargetsData | null;
}
