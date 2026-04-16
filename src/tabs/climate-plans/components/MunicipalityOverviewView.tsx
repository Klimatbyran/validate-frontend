import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Target,
  BarChart3,
  Scale,
  Globe,
  Calendar,
} from "lucide-react";
import type { MunicipalityClimatePlan } from "../lib/types";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";

type OverviewSection =
  | "overview"
  | "policy"
  | "targets-summary"
  | "targets-goals"
  | "frameworks"
  | "scope-timeline"
  | "accounting";

function getSection(sp: URLSearchParams): OverviewSection {
  const raw = sp.get("section");
  if (
    raw === "policy" ||
    raw === "targets-summary" ||
    raw === "targets-goals" ||
    raw === "frameworks" ||
    raw === "scope-timeline" ||
    raw === "accounting"
  ) {
    return raw;
  }
  return "overview";
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <div className="mb-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-gray-01">{value}</dd>
    </div>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <blockquote className="border-l-2 border-gray-03 pl-3 py-1 text-xs text-gray-02 italic mb-2">
      {text}
    </blockquote>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "blue" | "orange" | "green" | "pink";
}) {
  const accentClass =
    accent === "blue"
      ? "text-blue-03"
      : accent === "orange"
        ? "text-orange-03"
        : accent === "green"
          ? "text-green-03"
          : accent === "pink"
            ? "text-pink-03"
            : "text-gray-01";
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-5 text-center">
      <div className={cn("text-2xl font-semibold", accentClass)}>{value}</div>
      <div className="text-xs text-gray-02 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

export function MunicipalityOverviewView({ municipality }: { municipality: MunicipalityClimatePlan }) {
  const { t } = useI18n();
  const { planScope: ps, emissionTargets: et } = municipality;
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(() => getSection(searchParams), [searchParams]);

  const setSection = (next: OverviewSection) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set("section", next);
        return sp;
      },
      { replace: false },
    );
  };

  const planPeriod =
    ps?.temporal_scope?.plan_period_start && ps.temporal_scope.plan_period_end
      ? `${ps.temporal_scope.plan_period_start}–${ps.temporal_scope.plan_period_end}`
      : t("common.placeholderDash");

  const reductionGoals =
    et?.own_commitments?.filter((c) => c.goal_type === "emission_reduction")
      .length ?? 0;
  const implementationGoals =
    et?.own_commitments?.filter((c) => c.goal_type === "implementation").length ??
    0;
  const interventions = et?.external_references?.length ?? 0;
  const primaryTargetYear =
    et?.primary_target?.exists && et.primary_target.target_year
      ? et.primary_target.target_year
      : t("common.placeholderDash");

  const sections: Array<{
    id: OverviewSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "overview", label: t("climate.overview.sections.overview"), icon: <FileText size={14} /> },
    { id: "policy", label: t("climate.overview.sections.policy"), icon: <Target size={14} /> },
    { id: "targets-summary", label: t("climate.overview.sections.targetsSummary"), icon: <BarChart3 size={14} /> },
    { id: "targets-goals", label: t("climate.overview.sections.targetsAndGoals"), icon: <Target size={14} /> },
    { id: "frameworks", label: t("climate.overview.sections.frameworks"), icon: <Scale size={14} /> },
    { id: "scope-timeline", label: t("climate.overview.sections.scopeTimeline"), icon: <Globe size={14} /> },
    { id: "accounting", label: t("climate.overview.sections.accounting"), icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        <StatBox label={t("climate.compare.planPeriod")} value={planPeriod} accent="green" />
        <StatBox label={t("climate.overview.stats.reductionGoals")} value={reductionGoals} accent="blue" />
        <StatBox label={t("climate.overview.stats.implementationGoals")} value={implementationGoals} accent="orange" />
        <StatBox label={t("climate.overview.stats.interventions")} value={interventions} accent="pink" />
        <StatBox label={t("climate.compare.primaryTarget")} value={primaryTargetYear} accent="green" />
      </div>

      {/* Section tabs */}
      <div className="overflow-x-auto">
        <Tabs value={section} onValueChange={(v) => setSection(v as OverviewSection)}>
          <TabsList className={cn("min-w-max justify-start")}>
            {sections.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="gap-2 px-4">
                {s.icon}
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Panels */}
      {section === "overview" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.overview.documentOverview")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <dl>
              <Field label={t("climate.detail.documentTitle")} value={ps?.summary.document_title} />
              <Field label={t("climate.detail.documentType")} value={ps?.summary.document_type?.replace(/_/g, " ")} />
              <Field label={t("climate.detail.adoptingBody")} value={ps?.summary.adopting_body} />
              <Field label={t("climate.detail.adoptionDate")} value={ps?.summary.adoption_date} />
            </dl>
            <div>
              <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-2">
                {t("climate.detail.overallAssessment")}
              </div>
              <div className="bg-gray-03/20 rounded-lg p-4 text-sm text-gray-02">
                {ps?.summary.overall_assessment || t("common.placeholderDash")}
              </div>
            </div>
          </div>
        </Card>
      )}

      {section === "policy" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.detail.policyDomain")}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <dl>
              <Field
                label={t("climate.detail.primaryFocus")}
                value={
                  ps?.policy_domain.primary_focus === "both"
                    ? t("climate.compare.mitigationAndAdaptation")
                    : ps?.policy_domain.primary_focus?.replace(/_/g, " ")
                }
              />
              <Field label={t("climate.detail.mitigationDescription")} value={ps?.policy_domain.mitigation_description} />
              <Field label={t("climate.detail.adaptationDescription")} value={ps?.policy_domain.adaptation_description} />
              {(ps?.policy_domain.mitigation_sections?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <dt className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-1">
                    {t("climate.detail.mitigationSections")}
                  </dt>
                  <dd>
                    <ul className="list-disc list-inside text-sm text-gray-01 space-y-0.5">
                      {ps?.policy_domain.mitigation_sections.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            <div>
              <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-2">
                {t("climate.detail.sourceQuotes")}
              </div>
              {(ps?.policy_domain.source_quotes?.length ?? 0) > 0 ? (
                ps?.policy_domain.source_quotes.map((q, i) => <Quote key={i} text={q} />)
              ) : (
                <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
              )}
            </div>
          </div>
        </Card>
      )}

      {section === "targets-summary" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.detail.targetsSummary")}
          </div>
          <dl className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Field label={t("climate.detail.publicationYear")} value={et?.summary?.document_publication_year} />
              <Field label={t("climate.detail.scopeClarity")} value={et?.summary?.scope_clarity} />
              <Field label={t("climate.detail.sectoralTargetsConsistent")} value={et?.summary?.sectoral_targets_consistent} />
              <Field label={t("climate.detail.sectoralConsistencyNotes")} value={et?.summary?.sectoral_consistency_notes} />
            </div>
            <div>
              <Field label={t("climate.detail.explicitGhgScopes")} value={(et?.summary?.ghg_scopes_explicit ?? []).join(", ") || t("common.placeholderDash")} />
              <Field label={t("climate.detail.implicitGhgScopes")} value={(et?.summary?.ghg_scopes_implicit ?? []).join(", ") || t("common.placeholderDash")} />
              <Field label={t("climate.detail.ghgScopeNotes")} value={et?.summary?.ghg_scope_notes} />
              <Field label={t("climate.detail.overallAssessment")} value={et?.summary?.overall_assessment} />
            </div>
          </dl>
        </Card>
      )}

      {section === "targets-goals" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.detail.goalsAndTargets")}
          </div>

          {et?.primary_target?.exists && (
            <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-4 mb-4">
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.detail.primaryTarget")}
              </div>
              <div className="text-sm text-gray-01">
                {et.primary_target.reduction_percentage && `${et.primary_target.reduction_percentage}% reduction `}
                {et.primary_target.target_year && `by ${et.primary_target.target_year}`}
                {et.primary_target.scope && ` (${et.primary_target.scope.replace(/_/g, " ")})`}
              </div>
              {et.primary_target.source_quote && <Quote text={et.primary_target.source_quote} />}
            </div>
          )}

          <div className="text-xs font-medium uppercase tracking-wider text-gray-02 mb-2">
            {t("climate.detail.ownCommitments")} ({et?.own_commitments?.length ?? 0})
          </div>
          <div className="space-y-3">
            {(et?.own_commitments ?? []).map((c, i) => (
              <div key={i} className="p-4 bg-gray-03/20 rounded-lg">
                <div className="text-sm text-gray-01 mb-2">{c.goal_description}</div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-02">
                  {c.reduction_percentage && <span className="bg-blue-03/20 text-blue-03 px-2 py-0.5 rounded">{c.reduction_percentage}%</span>}
                  {c.target_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{t("climate.detail.target")}: {c.target_year}</span>}
                  {c.baseline_year && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{t("climate.detail.baseline")}: {c.baseline_year}</span>}
                  {c.scope && <span className="bg-gray-03/50 px-2 py-0.5 rounded">{c.scope.replace(/_/g, " ")}</span>}
                </div>
                {c.source_quote && <Quote text={c.source_quote} />}
              </div>
            ))}
            {(et?.own_commitments ?? []).length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </Card>
      )}

      {section === "frameworks" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.detail.frameworkAlignment")}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "paris_agreement_mentioned", label: t("climate.detail.parisAgreement") },
              { key: "one_point_five_mentioned", label: t("climate.detail.onePointFiveTarget") },
              { key: "carbon_budget_referenced", label: t("climate.detail.carbonBudget") },
              { key: "swedish_climate_act_referenced", label: t("climate.detail.swedishClimateAct") },
              { key: "swedish_national_targets_referenced", label: t("climate.detail.nationalTargets") },
              { key: "eu_frameworks_referenced", label: t("climate.detail.euFrameworks") },
            ].map((fw) => {
              const val = (et?.framework_alignment as any)?.[fw.key] ?? false;
              return (
                <span
                  key={fw.key}
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium",
                    val ? "bg-green-03/20 text-green-03" : "bg-gray-03/30 text-gray-02",
                  )}
                >
                  {val ? "✓" : "✗"} {fw.label}
                </span>
              );
            })}
          </div>

          <dl className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Field label={t("climate.detail.alignmentCharacter")} value={et?.framework_alignment?.alignment_character?.replace(/_/g, " ")} />
              <Field label={t("climate.detail.alignmentJustification")} value={et?.framework_alignment?.alignment_justification?.replace(/_/g, " ")} />
            </div>
            <div>
              <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-2">
                {t("climate.detail.sourceQuotes")}
              </div>
              {(et?.framework_alignment?.source_quotes?.length ?? 0) > 0 ? (
                et?.framework_alignment?.source_quotes.map((q, i) => <Quote key={i} text={q} />)
              ) : (
                <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
              )}
            </div>
          </dl>
        </Card>
      )}

      {section === "scope-timeline" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
              <Globe size={14} />
              {t("climate.detail.spatialScope")}
            </div>
            <dl>
              <Field label={t("climate.detail.primaryScope")} value={ps?.spatial_scope?.primary_scope?.replace(/_/g, " ")} />
              <Field label={t("climate.detail.addressesMetropolitanRegional")} value={String(ps?.spatial_scope?.addresses_metropolitan_or_regional ?? "")} />
              <Field label={t("climate.detail.distinguishesOperationsVsTerritory")} value={String(ps?.spatial_scope?.distinguishes_operations_vs_territory ?? "")} />
              <Field label={t("climate.detail.operationsVsTerritoryDescription")} value={ps?.spatial_scope?.operations_vs_territory_description} />
            </dl>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
              <Calendar size={14} />
              {t("climate.detail.timeline")}
            </div>
            <dl>
              <Field
                label={t("climate.detail.planPeriod")}
                value={
                  ps?.temporal_scope
                    ? `${ps.temporal_scope.plan_period_start} – ${ps.temporal_scope.plan_period_end}`
                    : t("common.placeholderDash")
                }
              />
              <Field label={t("climate.detail.hasRevisionCycle")} value={String(ps?.temporal_scope?.has_revision_cycle ?? "")} />
              <Field label={t("climate.detail.revisionCycle")} value={ps?.temporal_scope?.revision_cycle_description} />
            </dl>
          </Card>
        </div>
      )}

      {section === "accounting" && (
        <Card>
          <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-4">
            {t("climate.detail.emissionsAccounting")}
          </div>
          <dl className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Field label={t("climate.detail.accountingType")} value={et?.emissions_accounting?.accounting_type?.replace(/_/g, " ")} />
              <Field label={t("climate.detail.includesConsumptionBased")} value={String(et?.emissions_accounting?.includes_consumption_based ?? "")} />
              <Field label={t("climate.detail.methodologyDescribed")} value={String(et?.emissions_accounting?.methodology_described ?? "")} />
              <Field label={t("climate.detail.methodologyReference")} value={et?.emissions_accounting?.methodology_reference} />
            </div>
            <div>
              <Field label={t("climate.detail.methodologyNotes")} value={et?.emissions_accounting?.methodology_notes} />
              <div className="text-xs text-gray-02 uppercase tracking-wider font-medium mb-2">
                {t("climate.detail.sourceQuotes")}
              </div>
              {(et?.emissions_accounting?.source_quotes?.length ?? 0) > 0 ? (
                et?.emissions_accounting?.source_quotes.map((q, i) => <Quote key={i} text={q} />)
              ) : (
                <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
              )}
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}

