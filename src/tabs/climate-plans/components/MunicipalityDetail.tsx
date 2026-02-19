import { ArrowLeft } from "lucide-react";
import type { MunicipalityClimatePlan } from "../lib/types";
import { cn } from "@/lib/utils";

interface MunicipalityDetailProps {
  municipality: MunicipalityClimatePlan;
  onBack: () => void;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-01 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <div className="mb-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">{label}</dt>
      <dd className="text-sm text-gray-01">{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</dd>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mr-2 mb-2",
        value ? "bg-green-03/20 text-green-03" : "bg-gray-03/30 text-gray-02"
      )}
    >
      {value ? "✓" : "✗"} {label}
    </span>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <blockquote className="border-l-2 border-gray-03 pl-3 py-1 text-xs text-gray-02 italic mb-2">
      {text}
    </blockquote>
  );
}

export function MunicipalityDetail({ municipality: m, onBack }: MunicipalityDetailProps) {
  const { planScope: ps, emissionTargets: et } = m;

  const hasAnyData = ps !== null || et !== null;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-02 hover:text-gray-01 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to comparison
      </button>

      <h2 className="text-2xl font-semibold text-gray-01">{m.name}</h2>

      {!hasAnyData && (
        <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 text-gray-02 text-sm">
          No plan scope or emission targets data available for this municipality.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary */}
        {ps && (
        <Card title="Summary">
          <Field label="Document title" value={ps.summary.document_title} />
          <Field label="Document type" value={ps.summary.document_type?.replace(/_/g, " ")} />
          <Field label="Adopting body" value={ps.summary.adopting_body} />
          <Field label="Adoption date" value={ps.summary.adoption_date} />
          <Field label="Overall assessment" value={ps.summary.overall_assessment} />
        </Card>
        )}

        {/* Policy Domain */}
        {ps && (
        <Card title="Policy Domain">
          <Field label="Primary focus" value={
            ps.policy_domain.primary_focus === "both"
              ? "Mitigation + Adaptation"
              : ps.policy_domain.primary_focus?.replace(/_/g, " ")
          } />
          <Field label="Mitigation description" value={ps.policy_domain.mitigation_description} />
          <Field label="Adaptation description" value={ps.policy_domain.adaptation_description} />
          {(ps.policy_domain.mitigation_sections?.length ?? 0) > 0 && (
            <div className="mb-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">
                Mitigation sections
              </dt>
              <dd>
                <ul className="list-disc list-inside text-sm text-gray-01 space-y-0.5">
                  {ps.policy_domain.mitigation_sections.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {(ps.policy_domain.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">Source quotes</dt>
              {ps.policy_domain.source_quotes.map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Goals & Targets */}
        {et && (
        <Card title="Goals & Targets">
          {et.primary_target?.exists && (
            <div className="mb-4 p-3 bg-green-03/10 rounded-lg">
              <div className="text-xs font-medium uppercase tracking-wider text-green-03 mb-1">Primary target</div>
              <div className="text-sm text-gray-01">
                {et.primary_target.reduction_percentage && `${et.primary_target.reduction_percentage}% reduction `}
                {et.primary_target.target_year && `by ${et.primary_target.target_year}`}
                {et.primary_target.scope && ` (${et.primary_target.scope.replace(/_/g, " ")})`}
              </div>
              {et.primary_target.source_quote && <Quote text={et.primary_target.source_quote} />}
            </div>
          )}

          <div className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">
            Own commitments ({et.own_commitments?.length ?? 0})
          </div>
          <div className="space-y-3">
            {(et.own_commitments ?? []).map((c, i) => (
              <div key={i} className="p-3 bg-gray-03/30 rounded-lg">
                <div className="text-sm text-gray-01 mb-1">{c.goal_description}</div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-02">
                  {c.reduction_percentage && <span className="bg-blue-03/20 text-blue-03 px-2 py-0.5 rounded">{c.reduction_percentage}%</span>}
                  {c.target_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">Target: {c.target_year}</span>}
                  {c.baseline_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">Baseline: {c.baseline_year}</span>}
                  {c.scope && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{c.scope.replace(/_/g, " ")}</span>}
                  {(c.ghg_scopes_explicit?.length ?? 0) > 0 && (
                    <span className="bg-gray-03/50 px-2 py-0.5 rounded">Scope {c.ghg_scopes_explicit.join(", ")}</span>
                  )}
                </div>
                {c.source_quote && <Quote text={c.source_quote} />}
              </div>
            ))}
          </div>

          {(et.external_references?.length ?? 0) > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">
                External references
              </div>
              {(et.external_references ?? []).map((r, i) => (
                <div key={i} className="p-3 bg-gray-03/30 rounded-lg mb-2">
                  <div className="text-sm text-gray-01">{r.reference_description}</div>
                  <div className="text-xs text-gray-02 mt-1">
                    {r.source_organization} — {r.target_value}
                  </div>
                  {r.source_quote && <Quote text={r.source_quote} />}
                </div>
              ))}
            </div>
          )}
        </Card>
        )}

        {/* Spatial Scope */}
        {ps && (
        <Card title="Spatial Scope">
          <Field label="Primary scope" value={ps.spatial_scope?.primary_scope?.replace(/_/g, " ")} />
          <Field label="Addresses metropolitan/regional" value={ps.spatial_scope?.addresses_metropolitan_or_regional ? "Yes" : "No"} />
          <Field label="Regional description" value={ps.spatial_scope?.metropolitan_regional_description} />
          <Field label="Distinguishes operations vs territory" value={ps.spatial_scope?.distinguishes_operations_vs_territory ? "Yes" : "No"} />
          <Field label="Operations vs territory description" value={ps.spatial_scope?.operations_vs_territory_description} />
          {(ps.spatial_scope?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">Source quotes</dt>
              {(ps.spatial_scope?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Timeline */}
        {ps && (
        <Card title="Timeline">
          <Field label="Plan period" value={ps.temporal_scope ? `${ps.temporal_scope.plan_period_start} – ${ps.temporal_scope.plan_period_end}` : undefined} />
          <Field label="Has revision cycle" value={ps.temporal_scope?.has_revision_cycle ? "Yes" : "No"} />
          <Field label="Revision cycle" value={ps.temporal_scope?.revision_cycle_description} />
          {(ps.temporal_scope?.interim_milestones?.length ?? 0) > 0 && (
            <div className="mb-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">Interim milestones</dt>
              <dd>
                <ul className="list-disc list-inside text-sm text-gray-01 space-y-0.5">
                  {(ps.temporal_scope?.interim_milestones ?? []).map((milestone, i) => <li key={i}>{milestone}</li>)}
                </ul>
              </dd>
            </div>
          )}
        </Card>
        )}

        {/* Framework Alignment */}
        {et && (
        <Card title="Framework Alignment">
          <div className="flex flex-wrap mb-4">
            <BoolBadge value={et.framework_alignment?.paris_agreement_mentioned ?? false} label="Paris Agreement" />
            <BoolBadge value={et.framework_alignment?.one_point_five_mentioned ?? false} label="1.5°C target" />
            <BoolBadge value={et.framework_alignment?.carbon_budget_referenced ?? false} label="Carbon budget" />
            <BoolBadge value={et.framework_alignment?.swedish_climate_act_referenced ?? false} label="Swedish Climate Act" />
            <BoolBadge value={et.framework_alignment?.swedish_national_targets_referenced ?? false} label="National targets" />
            <BoolBadge value={et.framework_alignment?.eu_frameworks_referenced ?? false} label="EU frameworks" />
          </div>
          {et.framework_alignment?.carbon_budget_description && (
            <Field label="Carbon budget details" value={et.framework_alignment.carbon_budget_description} />
          )}
          {(et.framework_alignment?.eu_frameworks_named?.length ?? 0) > 0 && (
            <Field label="EU frameworks named" value={(et.framework_alignment?.eu_frameworks_named ?? []).join(", ")} />
          )}
          <Field label="Alignment character" value={et.framework_alignment?.alignment_character?.replace(/_/g, " ")} />
          <Field label="Alignment justification" value={et.framework_alignment?.alignment_justification?.replace(/_/g, " ")} />
          {(et.framework_alignment?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">Source quotes</dt>
              {(et.framework_alignment?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Emissions Accounting */}
        {et && (
        <Card title="Emissions Accounting">
          <Field label="Accounting type" value={et.emissions_accounting?.accounting_type?.replace(/_/g, " ")} />
          <Field label="Includes consumption-based" value={et.emissions_accounting?.includes_consumption_based ? "Yes" : "No"} />
          <Field label="Methodology described" value={et.emissions_accounting?.methodology_described ? "Yes" : "No"} />
          <Field label="Methodology reference" value={et.emissions_accounting?.methodology_reference} />
          <Field label="Methodology notes" value={et.emissions_accounting?.methodology_notes} />
          {(et.emissions_accounting?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">Source quotes</dt>
              {(et.emissions_accounting?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Targets Summary */}
        {et && (
        <Card title="Targets Summary">
          <Field label="Publication year" value={et.summary?.document_publication_year} />
          <div className="flex flex-wrap mb-4">
            <BoolBadge value={et.summary?.has_quantified_targets ?? false} label="Quantified targets" />
            <BoolBadge value={et.summary?.has_clear_baseline ?? false} label="Clear baseline" />
            <BoolBadge value={et.summary?.has_clear_timeline ?? false} label="Clear timeline" />
          </div>
          <Field label="Scope clarity" value={et.summary?.scope_clarity} />
          <Field label="Sectoral targets consistent" value={et.summary?.sectoral_targets_consistent} />
          <Field label="Sectoral consistency notes" value={et.summary?.sectoral_consistency_notes} />
          {(et.summary?.ghg_scopes_explicit?.length ?? 0) > 0 && (
            <Field label="Explicit GHG scopes" value={`Scope ${(et.summary?.ghg_scopes_explicit ?? []).join(", ")}`} />
          )}
          {(et.summary?.ghg_scopes_implicit?.length ?? 0) > 0 && (
            <Field label="Implicit GHG scopes" value={`Scope ${(et.summary?.ghg_scopes_implicit ?? []).join(", ")}`} />
          )}
          <Field label="GHG scope notes" value={et.summary?.ghg_scope_notes} />
          <Field label="Overall assessment" value={et.summary?.overall_assessment} />
        </Card>
        )}
      </div>
    </div>
  );
}
