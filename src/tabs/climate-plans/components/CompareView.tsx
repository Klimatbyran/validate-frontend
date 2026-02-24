import { useState } from "react";
import { ChevronDown, ChevronUp, Target, Calendar, Scale, Globe, BarChart3, Check, X } from "lucide-react";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import type { MunicipalityClimatePlan, OwnCommitment } from "../lib/types";
import { cn } from "@/lib/utils";

interface CompareViewProps {
  municipalities: MunicipalityClimatePlan[];
  onSelectMunicipality: (id: string) => void;
}

type Category = "targets" | "timeline" | "framework" | "scope" | "accounting";

const CATEGORY_IDS: { id: Category; labelKey: string; icon: React.ReactNode }[] = [
  { id: "targets", labelKey: "climate.compare.targets", icon: <Target size={16} /> },
  { id: "timeline", labelKey: "climate.compare.timeline", icon: <Calendar size={16} /> },
  { id: "framework", labelKey: "climate.compare.frameworks", icon: <Scale size={16} /> },
  { id: "scope", labelKey: "climate.compare.scope", icon: <Globe size={16} /> },
  { id: "accounting", labelKey: "climate.compare.accounting", icon: <BarChart3 size={16} /> },
];

// --- Reusable badge components ---

function YesNoBadge({ value }: { value: boolean }) {
  const { t } = useI18n();
  return value ? (
    <span className="inline-flex items-center gap-1 bg-green-03/20 text-green-03 text-xs font-medium px-2 py-1 rounded-full">
      <Check size={12} /> {t("common.yes")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-gray-03/40 text-gray-02 text-xs px-2 py-1 rounded-full">
      <X size={12} /> {t("common.no")}
    </span>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "blue" | "green" | "orange" | "pink" | "default" }) {
  const styles = {
    blue: "bg-blue-03/20 text-blue-03",
    green: "bg-green-03/20 text-green-03",
    orange: "bg-orange-03/20 text-orange-03",
    pink: "bg-pink-03/20 text-pink-03",
    default: "bg-gray-03/50 text-gray-02",
  };
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full", styles[variant])}>
      {children}
    </span>
  );
}

function ScopeBadges({ explicit, implicit }: { explicit?: string[]; implicit?: string[] }) {
  const { t } = useI18n();
  const all = new Set([...(explicit || []), ...(implicit || [])]);
  if (all.size === 0) return <span className="text-xs text-gray-02">{t("climate.compare.notSpecified")}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {["1", "2", "3"].map((s) => (
        <span key={s} className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full",
          all.has(s)
            ? explicit?.includes(s) ? "bg-blue-03/20 text-blue-03" : "bg-blue-03/10 text-blue-03/60 border border-blue-03/20"
            : "bg-gray-03/30 text-gray-02"
        )}>
          {t("climate.compare.scopeNumber", { n: s })}
          {all.has(s) && !explicit?.includes(s) && <span className="text-xs ml-1">{t("climate.compare.implicit")}</span>}
        </span>
      ))}
    </div>
  );
}

// --- Human-readable labels for enum-like values (labelKey for i18n) ---

const ACCOUNTING_TYPE_KEYS: Record<string, { labelKey: string; badgeKeys: string[] }> = {
  territorial: { labelKey: "climate.compare.territorialOnly", badgeKeys: ["climate.compare.territorialBadge"] },
  consumption: { labelKey: "climate.compare.consumptionBasedOnly", badgeKeys: ["climate.compare.consumptionBasedBadge"] },
  both: { labelKey: "climate.compare.territorialAndConsumption", badgeKeys: ["climate.compare.territorialBadge", "climate.compare.consumptionBasedBadge"] },
};

const FOCUS_KEYS: Record<string, { labelKey: string; badges: { labelKey: string; variant: "blue" | "green" | "orange" }[] }> = {
  mitigation: { labelKey: "climate.compare.mitigation", badges: [{ labelKey: "climate.compare.mitigation", variant: "green" }] },
  adaptation: { labelKey: "climate.compare.adaptation", badges: [{ labelKey: "climate.compare.adaptation", variant: "blue" }] },
  both: { labelKey: "climate.compare.mitigationAndAdaptation", badges: [{ labelKey: "climate.compare.mitigation", variant: "green" }, { labelKey: "climate.compare.adaptation", variant: "blue" }] },
};

const STRENGTH_KEYS: Record<string, { labelKey: string; variant: "green" | "blue" | "orange" | "default" }> = {
  adopted_goal: { labelKey: "climate.compare.adoptedGoal", variant: "green" },
  political_commitment: { labelKey: "climate.compare.politicalCommitment", variant: "blue" },
  aspiration: { labelKey: "climate.compare.aspiration", variant: "orange" },
};

const CONFIDENCE_STYLES: Record<string, { variant: "green" | "orange" | "default" }> = {
  high: { variant: "green" },
  medium: { variant: "orange" },
  low: { variant: "default" },
};

// --- Summary cards ---

const scopeTKey: Record<string, string> = {
  municipal_territory: "climate.compare.municipalTerritory",
  municipal_operations: "climate.compare.municipalOperations",
  whole_municipality: "climate.compare.wholeMunicipality",
  geographic_area: "climate.compare.geographicArea",
};

function MunicipalitySummaryCard({ m, onClick }: { m: MunicipalityClimatePlan; onClick: () => void }) {
  const { t } = useI18n();
  const et = m.emissionTargets;
  const ps = m.planScope;
  const pt = et?.primary_target;
  const reductionGoals = et?.own_commitments?.filter(
    (c) => c.goal_type === "emission_reduction" && c.reduction_percentage
  ) || [];
  const biggestReduction = reductionGoals.length > 0
    ? reductionGoals.reduce((max, c) =>
        Number(c.reduction_percentage) > Number(max.reduction_percentage) ? c : max
      )
    : null;

  const frameworkFlags = [
    { val: et?.framework_alignment?.paris_agreement_mentioned, labelKey: "climate.compare.frameworkShortParis" },
    { val: et?.framework_alignment?.one_point_five_mentioned, labelKey: "climate.compare.frameworkShort1_5" },
    { val: et?.framework_alignment?.carbon_budget_referenced, labelKey: "climate.compare.frameworkShortCarbonBudget" },
    { val: et?.framework_alignment?.swedish_climate_act_referenced, labelKey: "climate.compare.frameworkShortSwedishClimateAct" },
    { val: et?.framework_alignment?.eu_frameworks_referenced, labelKey: "climate.compare.frameworkShortEu" },
  ];

  return (
    <button
      onClick={onClick}
      className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-5 text-left hover:bg-gray-03/50 transition-colors flex-1 min-w-[280px]"
    >
      <div className="text-lg font-semibold text-gray-01 mb-3">{m.name}</div>

      {/* Primary target — always shown for symmetry */}
      {pt?.exists ? (
        <Callout variant="success" title={t("climate.compare.primaryTarget")} className="mb-3">
          <div className="text-2xl font-bold text-gray-01">{pt.target_year || "—"}</div>
          <Badge variant="default">{pt.scope && (scopeTKey[pt.scope] ? t(scopeTKey[pt.scope]) : pt.scope.replace(/_/g, " ")) || "—"}</Badge>
        </Callout>
      ) : (
        <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-3 mb-3 flex flex-col justify-center min-h-[88px]">
          <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">{t("climate.compare.primaryTarget")}</div>
          <div className="text-lg text-gray-02">{t("climate.compare.none")}</div>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-03">
            {biggestReduction ? `${biggestReduction.reduction_percentage}%` : "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.maxReduction")}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-01">
            {ps?.temporal_scope?.plan_period_start || "—"}–{ps?.temporal_scope?.plan_period_end?.slice(-2) || "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.planPeriod")}</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-03">
            {et?.own_commitments?.length || 0}
          </div>
          <div className="text-xs text-gray-02 uppercase">{t("climate.compare.goals")}</div>
        </div>
      </div>

      {/* Framework badges */}
      <div className="flex flex-wrap gap-1 mt-3">
        {frameworkFlags.map((fw) => (
          <span key={fw.labelKey} className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            fw.val ? "bg-green-03/15 text-green-03" : "bg-gray-03/30 text-gray-02"
          )}>
            {t(fw.labelKey)}
          </span>
        ))}
      </div>

      <div className="text-xs text-blue-03 mt-4">{t("climate.compare.viewFullDetails")}</div>
    </button>
  );
}

// --- Category panels ---

function TargetsPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const et = m.emissionTargets;
        if (!et) return <div key={m.id} className="text-gray-02 text-sm">{t("climate.compare.noData")}</div>;

        const reductionGoals = et.own_commitments.filter((c) => c.goal_type === "emission_reduction");
        const implementationGoals = et.own_commitments.filter((c) => c.goal_type === "implementation");

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {et.primary_target?.exists ? (
              <Callout variant="success" title={t("climate.compare.primaryTarget")}>
                <div className="text-xl font-bold text-gray-01 mb-2">
                  {et.primary_target.reduction_percentage
                    ? `${et.primary_target.reduction_percentage}% by ${et.primary_target.target_year}`
                    : `by ${et.primary_target.target_year}`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{scopeTKey[et.primary_target.scope || ""] ? t(scopeTKey[et.primary_target.scope || ""]) : et.primary_target.scope?.replace(/_/g, " ")}</Badge>
                  {et.primary_target.baseline_year && <Badge>{t("climate.detail.baseline")}: {et.primary_target.baseline_year}</Badge>}
                  {et.primary_target.confidence && (
                    <Badge variant={CONFIDENCE_STYLES[et.primary_target.confidence]?.variant || "default"}>
                      {et.primary_target.confidence} {t("climate.compare.confidence")}
                    </Badge>
                  )}
                </div>
              </Callout>
            ) : (
              <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-4 flex flex-col justify-center min-h-[100px]">
                <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">{t("climate.compare.primaryTarget")}</div>
                <div className="text-lg text-gray-02">{t("climate.compare.none")}</div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.reductionGoals")}
                <Badge variant={reductionGoals.length > 0 ? "blue" : "default"}>{reductionGoals.length}</Badge>
              </div>
              {reductionGoals.length > 0
                ? reductionGoals.map((c, i) => <GoalCard key={i} c={c} />)
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">{t("climate.compare.none")}</div>
              }
            </div>

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                {t("climate.compare.implementationGoals")}
                <Badge variant={implementationGoals.length > 0 ? "orange" : "default"}>{implementationGoals.length}</Badge>
              </div>
              {implementationGoals.length > 0
                ? implementationGoals.map((c, i) => <GoalCard key={i} c={c} />)
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">{t("climate.compare.none")}</div>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MUNICIPALITY_COLORS = [
  { bg: "bg-blue-03", text: "text-blue-03", bgFaint: "bg-blue-03/20", border: "border-blue-03" },
  { bg: "bg-orange-03", text: "text-orange-03", bgFaint: "bg-orange-03/20", border: "border-orange-03" },
  { bg: "bg-green-03", text: "text-green-03", bgFaint: "bg-green-03/20", border: "border-green-03" },
  { bg: "bg-pink-03", text: "text-pink-03", bgFaint: "bg-pink-03/20", border: "border-pink-03" },
];

interface TimelineEvent {
  year: number;
  label: string;
  type: "plan_start" | "plan_end" | "milestone" | "target";
  municipalityIndex: number;
  municipalityName: string;
}

function TimelinePanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  const events: TimelineEvent[] = [];

  municipalities.forEach((m, mi) => {
    const ts = m.planScope?.temporal_scope;
    const et = m.emissionTargets;

    if (ts?.plan_period_start) {
      events.push({ year: Number(ts.plan_period_start), label: t("climate.compare.planStart"), type: "plan_start", municipalityIndex: mi, municipalityName: m.name });
    }
    if (ts?.plan_period_end) {
      events.push({ year: Number(ts.plan_period_end), label: t("climate.compare.planEnd"), type: "plan_end", municipalityIndex: mi, municipalityName: m.name });
    }

    // Extract years from milestones
    ts?.interim_milestones?.forEach((milestone) => {
      const yearMatch = milestone.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        events.push({ year: Number(yearMatch[1]), label: milestone, type: "milestone", municipalityIndex: mi, municipalityName: m.name });
      }
    });

    // Target years from commitments
    et?.own_commitments?.forEach((c) => {
      if (c.target_year) {
        const shortLabel = c.reduction_percentage
          ? `${c.reduction_percentage}% reduction`
          : c.absolute_target || c.goal_description.slice(0, 40);
        events.push({ year: Number(c.target_year), label: shortLabel, type: "target", municipalityIndex: mi, municipalityName: m.name });
      }
    });

    if (et?.primary_target?.target_year) {
      events.push({ year: Number(et.primary_target.target_year), label: t("climate.compare.primaryTarget"), type: "target", municipalityIndex: mi, municipalityName: m.name });
    }
  });

  // Deduplicate events with same year + label + municipality
  const seen = new Set<string>();
  const uniqueEvents = events.filter((e) => {
    const key = `${e.year}-${e.label}-${e.municipalityIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Get year range
  const years = uniqueEvents.map((e) => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  // Group events by year for stacking
  const eventsByYear = new Map<number, TimelineEvent[]>();
  uniqueEvents.forEach((e) => {
    const existing = eventsByYear.get(e.year) || [];
    existing.push(e);
    eventsByYear.set(e.year, existing);
  });

  const typeIcons: Record<string, string> = {
    plan_start: "▶",
    plan_end: "■",
    milestone: "◆",
    target: "★",
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {municipalities.map((m, i) => {
          const color = MUNICIPALITY_COLORS[i % MUNICIPALITY_COLORS.length];
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full", color.bg)} />
              <span className="text-sm text-gray-01">{m.name}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-02">
          <span>▶ {t("climate.compare.legendStart")}</span>
          <span>■ {t("climate.compare.legendEnd")}</span>
          <span>◆ {t("climate.compare.legendMilestone")}</span>
          <span>★ {t("climate.compare.legendTarget")}</span>
        </div>
      </div>

      {/* Visual timeline */}
      <div className="relative">
        {/* Track */}
        <div className="h-1 bg-gray-03/30 rounded-full mx-8" />

        {/* Year labels along the track */}
        <div className="relative h-0 mx-8">
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
            .filter((y) => y % 5 === 0 || y === minYear || y === maxYear)
            .map((year) => (
              <div
                key={year}
                className="absolute -top-3 transform -translate-x-1/2"
                style={{ left: `${((year - minYear) / yearRange) * 100}%` }}
              >
                <div className="w-px h-2 bg-gray-03/50 mx-auto" />
                <div className="text-xs text-gray-03 mt-1">{year}</div>
              </div>
            ))}
        </div>

        {/* Events */}
        <div className="relative mt-8 min-h-[120px]">
          {Array.from(eventsByYear.entries())
            .sort(([a], [b]) => a - b)
            .map(([year, yearEvents]) => {
              const leftPct = ((year - minYear) / yearRange) * 100;
              return (
                <div
                  key={year}
                  className="absolute flex flex-col items-center gap-1"
                  style={{ left: `calc(${leftPct}% + 32px)`, transform: "translateX(-50%)" }}
                >
                  {yearEvents.map((e, i) => {
                    const color = MUNICIPALITY_COLORS[e.municipalityIndex % MUNICIPALITY_COLORS.length];
                    return (
                      <div key={i} className="group relative flex flex-col items-center">
                        <span className={cn("text-sm cursor-default", color.text)}>
                          {typeIcons[e.type]}
                        </span>
                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute bottom-full mb-2 z-10">
                          <div className={cn(
                            "rounded-lg px-3 py-2 text-xs whitespace-nowrap border",
                            color.bgFaint, color.border, color.text
                          )}>
                            <div className="font-medium">{e.municipalityName}</div>
                            <div className="text-gray-01">{e.label}</div>
                            <div className="text-gray-02">{e.year}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <span className="text-xs text-gray-02 font-medium">{year}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Detail cards below */}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
        {municipalities.map((m, mi) => {
          const ts = m.planScope?.temporal_scope;
          const color = MUNICIPALITY_COLORS[mi % MUNICIPALITY_COLORS.length];
          if (!ts) return <div key={m.id} className="text-gray-02 text-sm">{t("climate.compare.noData")}</div>;
          return (
            <div key={m.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full", color.bg)} />
                <span className="text-sm font-medium text-gray-01">{m.name}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="blue">{ts.plan_period_start} – {ts.plan_period_end}</Badge>
                {ts.has_revision_cycle && <Badge variant="green">{t("climate.compare.hasRevisionCycle")}</Badge>}
                {!ts.has_revision_cycle && <Badge>{t("climate.compare.noRevisionCycle")}</Badge>}
              </div>

              {ts.revision_cycle_description && (
                <div className="text-xs text-gray-02 bg-gray-03/20 rounded-lg p-3">{ts.revision_cycle_description}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FrameworkPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  const frameworks = [
    { key: "paris_agreement_mentioned" as const, labelKey: "climate.detail.parisAgreement" },
    { key: "one_point_five_mentioned" as const, labelKey: "climate.detail.onePointFiveTarget" },
    { key: "carbon_budget_referenced" as const, labelKey: "climate.detail.carbonBudget" },
    { key: "swedish_climate_act_referenced" as const, labelKey: "climate.detail.swedishClimateAct" },
    { key: "swedish_national_targets_referenced" as const, labelKey: "climate.compare.swedishNationalTargets" },
    { key: "eu_frameworks_referenced" as const, labelKey: "climate.detail.euFrameworks" },
  ];

  return (
    <div className="space-y-6">
      {/* Framework checklist as badges per municipality */}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
        {municipalities.map((m) => (
          <div key={m.id}>
            <div className="text-sm font-medium text-gray-01 mb-3">{m.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map((fw) => {
                const val = m.emissionTargets?.framework_alignment?.[fw.key];
                return (
                  <span key={fw.key} className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full",
                    val ? "bg-green-03/20 text-green-03" : "bg-gray-03/30 text-gray-02"
                  )}>
                    {val ? <Check size={12} /> : <X size={12} />}
                    {t(fw.labelKey)}
                  </span>
                );
              })}
            </div>

            {/* EU frameworks named */}
            {m.emissionTargets?.framework_alignment?.eu_frameworks_referenced && (
              <div className="mt-2">
                <div className="text-xs text-gray-02 mb-1">{t("climate.compare.euFrameworksLabel")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.emissionTargets.framework_alignment.eu_frameworks_named?.length > 0
                    ? m.emissionTargets.framework_alignment.eu_frameworks_named.map((name, i) => (
                        <Badge key={i} variant="blue">{name}</Badge>
                      ))
                    : <Badge>{t("climate.compare.referencedNotNamed")}</Badge>
                  }
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* External references */}
      <div>
        <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-3">{t("climate.compare.externalReferences")}</div>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
          {municipalities.map((m) => {
            const refs = m.emissionTargets?.external_references;
            return (
            <div key={m.id} className="space-y-2">
              {refs && refs.length > 0
                ? refs.map((r, i) => (
                    <div key={i} className="bg-gray-03/30 rounded-lg p-3">
                      <div className="text-sm text-gray-01 mb-1.5">{r.reference_description}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge>{r.source_organization}</Badge>
                        <Badge variant="blue">{r.target_value}</Badge>
                      </div>
                    </div>
                  ))
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">{t("climate.compare.none")}</div>
              }
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

function ScopePanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const pd = m.planScope?.policy_domain;
        const ss = m.planScope?.spatial_scope;
        if (!pd && !ss) return <div key={m.id} className="text-gray-02 text-sm">{t("climate.compare.noData")}</div>;
        const focus = FOCUS_KEYS[pd?.primary_focus || ""];
        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.focus")}</span>
                {focus
                  ? <div className="flex flex-wrap gap-1.5">{focus.badges.map((b, i) => <Badge key={i} variant={b.variant}>{t(b.labelKey)}</Badge>)}</div>
                  : <Badge>{pd?.primary_focus?.replace(/_/g, " ") || "—"}</Badge>
                }
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.spatialScope")}</span>
                <Badge variant="blue">{scopeTKey[ss?.primary_scope || ""] ? t(scopeTKey[ss?.primary_scope || ""]) : ss?.primary_scope?.replace(/_/g, " ") || "—"}</Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.operationsVsTerritory")}</span>
                <YesNoBadge value={ss?.distinguishes_operations_vs_territory || false} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.compare.regionalAlignment")}</span>
                <YesNoBadge value={ss?.addresses_metropolitan_or_regional || false} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountingPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const ea = m.emissionTargets?.emissions_accounting;
        const su = m.emissionTargets?.summary;
        if (!ea) return <div key={m.id} className="text-gray-02 text-sm">{t("climate.compare.noData")}</div>;

        const accountingInfo = ACCOUNTING_TYPE_KEYS[ea.accounting_type];
        const badgeLabels = accountingInfo
          ? accountingInfo.badgeKeys.map((key) => t(key))
          : [ea.accounting_type?.replace(/_/g, " ") || "—"];

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {/* Accounting type as badges */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">{t("climate.compare.accountingApproach")}</div>
              <div className="flex flex-wrap gap-1.5">
                {badgeLabels.map((label, i) => (
                  <Badge key={i} variant="blue">{label}</Badge>
                ))}
              </div>
            </div>

            {/* GHG scopes */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">{t("climate.compare.ghgScopesCovered")}</div>
              <ScopeBadges explicit={su?.ghg_scopes_explicit} implicit={su?.ghg_scopes_implicit} />
            </div>

            {/* Boolean checks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.detail.includesConsumptionBased")}</span>
                <YesNoBadge value={ea.includes_consumption_based} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">{t("climate.detail.methodologyDescribed")}</span>
                <YesNoBadge value={ea.methodology_described} />
              </div>
            </div>

            {/* Methodology reference */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">{t("climate.compare.dataSource")}</div>
              {ea.methodology_reference
                ? <Badge>{ea.methodology_reference}</Badge>
                : <Badge>{t("climate.compare.notSpecified")}</Badge>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Goal card ---

function GoalCard({ c }: { c: OwnCommitment }) {
  const { t } = useI18n();
  const hasReduction = c.reduction_percentage && c.reduction_percentage !== "";
  const hasAbsolute = c.absolute_target && c.absolute_target !== "";
  const strength = STRENGTH_KEYS[c.commitment_strength];

  return (
    <div className="bg-gray-03/30 rounded-lg p-3 mb-2">
      <div className="text-sm text-gray-01 mb-2">{c.goal_description}</div>
      <div className="flex flex-wrap gap-1.5">
        {hasReduction && <Badge variant="blue">{c.reduction_percentage}%</Badge>}
        {hasAbsolute && <Badge variant="blue">{c.absolute_target}</Badge>}
        {c.target_year && <Badge>{t("climate.detail.target")}: {c.target_year}</Badge>}
        {c.baseline_year && <Badge>{t("climate.detail.baseline")}: {c.baseline_year}</Badge>}
        {c.sector && <Badge variant="orange">{c.sector}</Badge>}
        {c.ghg_scopes_explicit?.length > 0 && <Badge>{t("climate.compare.scopeNumber", { n: c.ghg_scopes_explicit.join("+") })}</Badge>}
        {c.ghg_scopes_implicit?.length > 0 && <Badge>{t("climate.compare.scopeNumber", { n: c.ghg_scopes_implicit.join("+") })} {t("climate.compare.implicit")}</Badge>}
        {strength && <Badge variant={strength.variant}>{t(strength.labelKey)}</Badge>}
        {c.scope && <Badge>{scopeTKey[c.scope] ? t(scopeTKey[c.scope]) : c.scope.replace(/_/g, " ")}</Badge>}
      </div>
    </div>
  );
}

// --- Main ---

export function CompareView({ municipalities, onSelectMunicipality }: CompareViewProps) {
  const { t } = useI18n();
  const [expandedCategory, setExpandedCategory] = useState<Category | null>(null);

  const toggleCategory = (cat: Category) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  const panelMap: Record<Category, React.ReactNode> = {
    targets: <TargetsPanel municipalities={municipalities} />,
    timeline: <TimelinePanel municipalities={municipalities} />,
    framework: <FrameworkPanel municipalities={municipalities} />,
    scope: <ScopePanel municipalities={municipalities} />,
    accounting: <AccountingPanel municipalities={municipalities} />,
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="flex gap-4 flex-wrap">
        {municipalities.map((m) => (
          <MunicipalitySummaryCard
            key={m.id}
            m={m}
            onClick={() => onSelectMunicipality(m.id)}
          />
        ))}
      </div>

      {/* Category drill-down */}
      <div className="space-y-2">
        <div className="text-xs text-gray-02 uppercase tracking-wider font-medium">
          {t("climate.compare.compareInDetail")}
        </div>
        {CATEGORY_IDS.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-lg transition-colors",
                expandedCategory === cat.id
                  ? "bg-gray-03/50 rounded-b-none"
                  : "bg-gray-04/80 hover:bg-gray-03/30"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-02">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-01">{t(cat.labelKey)}</span>
              </div>
              {expandedCategory === cat.id ? (
                <ChevronUp size={16} className="text-gray-02" />
              ) : (
                <ChevronDown size={16} className="text-gray-02" />
              )}
            </button>
            {expandedCategory === cat.id && (
              <div className="bg-gray-04/60 rounded-b-lg p-5 border-t border-gray-03/30">
                {panelMap[cat.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
