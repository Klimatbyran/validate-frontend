// Configuration for which fields are comparable across municipalities

export interface FieldConfig {
  label: string;
  comparable: boolean;
  category: "goals" | "timeline" | "framework" | "scope" | "accounting" | "summary";
}

export const COMPARABLE_FIELDS: Record<string, FieldConfig> = {
  // Goals - comparable
  "primary_target.target_year": { label: "Primary target year", comparable: true, category: "goals" },
  "primary_target.reduction_percentage": { label: "Primary reduction target", comparable: true, category: "goals" },
  "primary_target.scope": { label: "Primary target scope", comparable: true, category: "goals" },
  "own_commitments_summary": { label: "Emission reduction targets", comparable: true, category: "goals" },
  "summary.has_quantified_targets": { label: "Has quantified targets", comparable: true, category: "goals" },
  "summary.has_clear_baseline": { label: "Has clear baseline", comparable: true, category: "goals" },
  "summary.has_clear_timeline": { label: "Has clear timeline", comparable: true, category: "goals" },

  // Timeline - comparable
  "temporal_scope.plan_period_start": { label: "Plan start", comparable: true, category: "timeline" },
  "temporal_scope.plan_period_end": { label: "Plan end", comparable: true, category: "timeline" },
  "temporal_scope.has_revision_cycle": { label: "Has revision cycle", comparable: true, category: "timeline" },

  // Framework alignment - comparable
  "framework_alignment.paris_agreement_mentioned": { label: "Paris Agreement", comparable: true, category: "framework" },
  "framework_alignment.one_point_five_mentioned": { label: "1.5°C target", comparable: true, category: "framework" },
  "framework_alignment.carbon_budget_referenced": { label: "Carbon budget", comparable: true, category: "framework" },
  "framework_alignment.swedish_climate_act_referenced": { label: "Swedish Climate Act", comparable: true, category: "framework" },
  "framework_alignment.swedish_national_targets_referenced": { label: "Swedish national targets", comparable: true, category: "framework" },
  "framework_alignment.eu_frameworks_referenced": { label: "EU frameworks", comparable: true, category: "framework" },

  // Scope - comparable
  "policy_domain.primary_focus": { label: "Primary focus", comparable: true, category: "scope" },
  "spatial_scope.primary_scope": { label: "Spatial scope", comparable: true, category: "scope" },
  "spatial_scope.distinguishes_operations_vs_territory": { label: "Operations vs territory", comparable: true, category: "scope" },

  // Accounting - comparable
  "emissions_accounting.accounting_type": { label: "Accounting type", comparable: true, category: "accounting" },
  "emissions_accounting.includes_consumption_based": { label: "Includes consumption-based", comparable: true, category: "accounting" },

  // Not comparable - detail view only
  "policy_domain.source_quotes": { label: "Policy source quotes", comparable: false, category: "scope" },
  "policy_domain.mitigation_description": { label: "Mitigation description", comparable: false, category: "scope" },
  "policy_domain.adaptation_description": { label: "Adaptation description", comparable: false, category: "scope" },
  "policy_domain.mitigation_sections": { label: "Mitigation sections", comparable: false, category: "scope" },
  "temporal_scope.revision_cycle_description": { label: "Revision cycle details", comparable: false, category: "timeline" },
  "temporal_scope.interim_milestones": { label: "Interim milestones", comparable: false, category: "timeline" },
  "emissions_accounting.methodology_notes": { label: "Methodology notes", comparable: false, category: "accounting" },
  "framework_alignment.carbon_budget_description": { label: "Carbon budget details", comparable: false, category: "framework" },
  "framework_alignment.source_quotes": { label: "Framework source quotes", comparable: false, category: "framework" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  goals: "Goals & Targets",
  timeline: "Timeline",
  framework: "Framework Alignment",
  scope: "Plan Scope",
  accounting: "Emissions Accounting",
  summary: "Summary",
};

export function getComparableFields() {
  return Object.entries(COMPARABLE_FIELDS).filter(([, config]) => config.comparable);
}

export function getFieldsByCategory(comparableOnly: boolean) {
  const fields = comparableOnly
    ? getComparableFields()
    : Object.entries(COMPARABLE_FIELDS);

  const grouped: Record<string, Array<[string, FieldConfig]>> = {};
  for (const entry of fields) {
    const cat = entry[1].category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }
  return grouped;
}
