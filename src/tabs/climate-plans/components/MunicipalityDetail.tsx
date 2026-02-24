import { ArrowLeft } from "lucide-react";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
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

function Field({ label, value, yesNo }: { label: string; value: React.ReactNode; yesNo?: (v: boolean) => string }) {
  if (value === "" || value === null || value === undefined) return null;
  const display = typeof value === "boolean" && yesNo ? yesNo(value) : value;
  return (
    <div className="mb-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">{label}</dt>
      <dd className="text-sm text-gray-01">{display}</dd>
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
  const { t } = useI18n();
  const { planScope: ps, emissionTargets: et } = m;
  const yesNo = (v: boolean) => (v ? t("common.yes") : t("common.no"));

  const hasAnyData = ps !== null || et !== null;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-02 hover:text-gray-01 transition-colors"
      >
        <ArrowLeft size={16} />
        {t("climate.detail.backToComparison")}
      </button>

      <h2 className="text-2xl font-semibold text-gray-01">{m.name}</h2>

      {!hasAnyData && (
        <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 text-gray-02 text-sm">
          {t("climate.detail.noDataAvailable")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary */}
        {ps && (
        <Card title={t("climate.detail.summary")}>
          <Field label={t("climate.detail.documentTitle")} value={ps.summary.document_title} yesNo={yesNo} />
          <Field label={t("climate.detail.documentType")} value={ps.summary.document_type?.replace(/_/g, " ")} yesNo={yesNo} />
          <Field label={t("climate.detail.adoptingBody")} value={ps.summary.adopting_body} yesNo={yesNo} />
          <Field label={t("climate.detail.adoptionDate")} value={ps.summary.adoption_date} yesNo={yesNo} />
          <Field label={t("climate.detail.overallAssessment")} value={ps.summary.overall_assessment} yesNo={yesNo} />
        </Card>
        )}

        {/* Policy Domain */}
        {ps && (
        <Card title={t("climate.detail.policyDomain")}>
          <Field label={t("climate.detail.primaryFocus")} value={
            ps.policy_domain.primary_focus === "both"
              ? t("climate.compare.mitigationAndAdaptation")
              : ps.policy_domain.primary_focus?.replace(/_/g, " ")
          } yesNo={yesNo} />
          <Field label={t("climate.detail.mitigationDescription")} value={ps.policy_domain.mitigation_description} yesNo={yesNo} />
          <Field label={t("climate.detail.adaptationDescription")} value={ps.policy_domain.adaptation_description} yesNo={yesNo} />
          {(ps.policy_domain.mitigation_sections?.length ?? 0) > 0 && (
            <div className="mb-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">
                {t("climate.detail.mitigationSections")}
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
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">{t("climate.detail.sourceQuotes")}</dt>
              {ps.policy_domain.source_quotes.map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Goals & Targets */}
        {et && (
        <Card title={t("climate.detail.goalsAndTargets")}>
          {et.primary_target?.exists && (
            <Callout variant="success" title={t("climate.detail.primaryTarget")} className="mb-4">
              <div className="text-sm text-gray-01">
                {et.primary_target.reduction_percentage && `${et.primary_target.reduction_percentage}% reduction `}
                {et.primary_target.target_year && `by ${et.primary_target.target_year}`}
                {et.primary_target.scope && ` (${et.primary_target.scope.replace(/_/g, " ")})`}
              </div>
              {et.primary_target.source_quote && <Quote text={et.primary_target.source_quote} />}
            </Callout>
          )}

          <div className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">
            {t("climate.detail.ownCommitments")} ({et.own_commitments?.length ?? 0})
          </div>
          <div className="space-y-3">
            {(et.own_commitments ?? []).map((c, i) => (
              <div key={i} className="p-3 bg-gray-03/30 rounded-lg">
                <div className="text-sm text-gray-01 mb-1">{c.goal_description}</div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-02">
                  {c.reduction_percentage && <span className="bg-blue-03/20 text-blue-03 px-2 py-0.5 rounded">{c.reduction_percentage}%</span>}
                  {c.target_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{t("climate.detail.target")}: {c.target_year}</span>}
                  {c.baseline_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{t("climate.detail.baseline")}: {c.baseline_year}</span>}
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
                {t("climate.detail.externalReferences")}
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
        <Card title={t("climate.detail.spatialScope")}>
          <Field label={t("climate.detail.primaryScope")} value={ps.spatial_scope?.primary_scope?.replace(/_/g, " ")} yesNo={yesNo} />
          <Field label={t("climate.detail.addressesMetropolitanRegional")} value={ps.spatial_scope?.addresses_metropolitan_or_regional} yesNo={yesNo} />
          <Field label={t("climate.detail.regionalDescription")} value={ps.spatial_scope?.metropolitan_regional_description} yesNo={yesNo} />
          <Field label={t("climate.detail.distinguishesOperationsVsTerritory")} value={ps.spatial_scope?.distinguishes_operations_vs_territory} yesNo={yesNo} />
          <Field label={t("climate.detail.operationsVsTerritoryDescription")} value={ps.spatial_scope?.operations_vs_territory_description} yesNo={yesNo} />
          {(ps.spatial_scope?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">{t("climate.detail.sourceQuotes")}</dt>
              {(ps.spatial_scope?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Timeline */}
        {ps && (
        <Card title={t("climate.detail.timeline")}>
          <Field label={t("climate.detail.planPeriod")} value={ps.temporal_scope ? `${ps.temporal_scope.plan_period_start} – ${ps.temporal_scope.plan_period_end}` : undefined} yesNo={yesNo} />
          <Field label={t("climate.detail.hasRevisionCycle")} value={ps.temporal_scope?.has_revision_cycle} yesNo={yesNo} />
          <Field label={t("climate.detail.revisionCycle")} value={ps.temporal_scope?.revision_cycle_description} yesNo={yesNo} />
          {(ps.temporal_scope?.interim_milestones?.length ?? 0) > 0 && (
            <div className="mb-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">{t("climate.detail.interimMilestones")}</dt>
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
        <Card title={t("climate.detail.frameworkAlignment")}>
          <div className="flex flex-wrap mb-4">
            <BoolBadge value={et.framework_alignment?.paris_agreement_mentioned ?? false} label={t("climate.detail.parisAgreement")} />
            <BoolBadge value={et.framework_alignment?.one_point_five_mentioned ?? false} label={t("climate.detail.onePointFiveTarget")} />
            <BoolBadge value={et.framework_alignment?.carbon_budget_referenced ?? false} label={t("climate.detail.carbonBudget")} />
            <BoolBadge value={et.framework_alignment?.swedish_climate_act_referenced ?? false} label={t("climate.detail.swedishClimateAct")} />
            <BoolBadge value={et.framework_alignment?.swedish_national_targets_referenced ?? false} label={t("climate.detail.nationalTargets")} />
            <BoolBadge value={et.framework_alignment?.eu_frameworks_referenced ?? false} label={t("climate.detail.euFrameworks")} />
          </div>
          {et.framework_alignment?.carbon_budget_description && (
            <Field label={t("climate.detail.carbonBudgetDetails")} value={et.framework_alignment.carbon_budget_description} yesNo={yesNo} />
          )}
          {(et.framework_alignment?.eu_frameworks_named?.length ?? 0) > 0 && (
            <Field label={t("climate.detail.euFrameworksNamed")} value={(et.framework_alignment?.eu_frameworks_named ?? []).join(", ")} yesNo={yesNo} />
          )}
          <Field label={t("climate.detail.alignmentCharacter")} value={et.framework_alignment?.alignment_character?.replace(/_/g, " ")} yesNo={yesNo} />
          <Field label={t("climate.detail.alignmentJustification")} value={et.framework_alignment?.alignment_justification?.replace(/_/g, " ")} yesNo={yesNo} />
          {(et.framework_alignment?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">{t("climate.detail.sourceQuotes")}</dt>
              {(et.framework_alignment?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Emissions Accounting */}
        {et && (
        <Card title={t("climate.detail.emissionsAccounting")}>
          <Field label={t("climate.detail.accountingType")} value={et.emissions_accounting?.accounting_type?.replace(/_/g, " ")} yesNo={yesNo} />
          <Field label={t("climate.detail.includesConsumptionBased")} value={et.emissions_accounting?.includes_consumption_based} yesNo={yesNo} />
          <Field label={t("climate.detail.methodologyDescribed")} value={et.emissions_accounting?.methodology_described} yesNo={yesNo} />
          <Field label={t("climate.detail.methodologyReference")} value={et.emissions_accounting?.methodology_reference} yesNo={yesNo} />
          <Field label={t("climate.detail.methodologyNotes")} value={et.emissions_accounting?.methodology_notes} yesNo={yesNo} />
          {(et.emissions_accounting?.source_quotes?.length ?? 0) > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">{t("climate.detail.sourceQuotes")}</dt>
              {(et.emissions_accounting?.source_quotes ?? []).map((q, i) => <Quote key={i} text={q} />)}
            </div>
          )}
        </Card>
        )}

        {/* Targets Summary */}
        {et && (
        <Card title={t("climate.detail.targetsSummary")}>
          <Field label={t("climate.detail.publicationYear")} value={et.summary?.document_publication_year} yesNo={yesNo} />
          <div className="flex flex-wrap mb-4">
            <BoolBadge value={et.summary?.has_quantified_targets ?? false} label={t("climate.detail.quantifiedTargets")} />
            <BoolBadge value={et.summary?.has_clear_baseline ?? false} label={t("climate.detail.clearBaseline")} />
            <BoolBadge value={et.summary?.has_clear_timeline ?? false} label={t("climate.detail.clearTimeline")} />
          </div>
          <Field label={t("climate.detail.scopeClarity")} value={et.summary?.scope_clarity} yesNo={yesNo} />
          <Field label={t("climate.detail.sectoralTargetsConsistent")} value={et.summary?.sectoral_targets_consistent} yesNo={yesNo} />
          <Field label={t("climate.detail.sectoralConsistencyNotes")} value={et.summary?.sectoral_consistency_notes} yesNo={yesNo} />
          {(et.summary?.ghg_scopes_explicit?.length ?? 0) > 0 && (
            <Field label={t("climate.detail.explicitGhgScopes")} value={`Scope ${(et.summary?.ghg_scopes_explicit ?? []).join(", ")}`} yesNo={yesNo} />
          )}
          {(et.summary?.ghg_scopes_implicit?.length ?? 0) > 0 && (
            <Field label={t("climate.detail.implicitGhgScopes")} value={`Scope ${(et.summary?.ghg_scopes_implicit ?? []).join(", ")}`} yesNo={yesNo} />
          )}
          <Field label={t("climate.detail.ghgScopeNotes")} value={et.summary?.ghg_scope_notes} yesNo={yesNo} />
          <Field label={t("climate.detail.overallAssessment")} value={et.summary?.overall_assessment} yesNo={yesNo} />
        </Card>
        )}
      </div>
    </div>
  );
}
