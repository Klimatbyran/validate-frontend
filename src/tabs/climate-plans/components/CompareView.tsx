import { useState } from "react";
import { ChevronDown, ChevronUp, Target, Calendar, Scale, Globe, BarChart3, Check, X } from "lucide-react";
import type { MunicipalityClimatePlan, OwnCommitment } from "../lib/types";
import { cn } from "@/lib/utils";

interface CompareViewProps {
  municipalities: MunicipalityClimatePlan[];
  onSelectMunicipality: (id: string) => void;
}

type Category = "targets" | "timeline" | "framework" | "scope" | "accounting";

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: "targets", label: "Targets", icon: <Target size={16} /> },
  { id: "timeline", label: "Timeline", icon: <Calendar size={16} /> },
  { id: "framework", label: "Frameworks", icon: <Scale size={16} /> },
  { id: "scope", label: "Scope", icon: <Globe size={16} /> },
  { id: "accounting", label: "Accounting", icon: <BarChart3 size={16} /> },
];

// --- Reusable badge components ---

function YesNoBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 bg-green-03/20 text-green-03 text-xs font-medium px-2 py-1 rounded-full">
      <Check size={12} /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-gray-03/40 text-gray-02 text-xs px-2 py-1 rounded-full">
      <X size={12} /> No
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
  const all = new Set([...(explicit || []), ...(implicit || [])]);
  if (all.size === 0) return <span className="text-xs text-gray-02">Not specified</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {["1", "2", "3"].map((s) => (
        <span key={s} className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full",
          all.has(s)
            ? explicit?.includes(s) ? "bg-blue-03/20 text-blue-03" : "bg-blue-03/10 text-blue-03/60 border border-blue-03/20"
            : "bg-gray-03/30 text-gray-02"
        )}>
          Scope {s}
          {all.has(s) && !explicit?.includes(s) && <span className="text-xs ml-1">(implicit)</span>}
        </span>
      ))}
    </div>
  );
}

// --- Human-readable labels for enum-like values ---

const ACCOUNTING_TYPE_LABELS: Record<string, { label: string; badges: string[] }> = {
  territorial: { label: "Territorial only", badges: ["Territorial"] },
  consumption: { label: "Consumption-based only", badges: ["Consumption-based"] },
  both: { label: "Territorial + Consumption-based", badges: ["Territorial", "Consumption-based"] },
};

const SCOPE_LABELS: Record<string, string> = {
  municipal_territory: "Municipal territory",
  municipal_operations: "Municipal operations",
  whole_municipality: "Whole municipality",
  geographic_area: "Geographic area",
};

const FOCUS_LABELS: Record<string, { label: string; badges: { label: string; variant: "blue" | "green" | "orange" }[] }> = {
  mitigation: { label: "Mitigation", badges: [{ label: "Mitigation", variant: "green" }] },
  adaptation: { label: "Adaptation", badges: [{ label: "Adaptation", variant: "blue" }] },
  both: { label: "Mitigation + Adaptation", badges: [{ label: "Mitigation", variant: "green" }, { label: "Adaptation", variant: "blue" }] },
};

const STRENGTH_LABELS: Record<string, { label: string; variant: "green" | "blue" | "orange" | "default" }> = {
  adopted_goal: { label: "Adopted goal", variant: "green" },
  political_commitment: { label: "Political commitment", variant: "blue" },
  aspiration: { label: "Aspiration", variant: "orange" },
};

const CONFIDENCE_STYLES: Record<string, { variant: "green" | "orange" | "default" }> = {
  high: { variant: "green" },
  medium: { variant: "orange" },
  low: { variant: "default" },
};

// --- Summary cards ---

function MunicipalitySummaryCard({ m, onClick }: { m: MunicipalityClimatePlan; onClick: () => void }) {
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
    { val: et?.framework_alignment?.paris_agreement_mentioned, label: "Paris" },
    { val: et?.framework_alignment?.one_point_five_mentioned, label: "1.5°C" },
    { val: et?.framework_alignment?.carbon_budget_referenced, label: "Carbon budget" },
    { val: et?.framework_alignment?.swedish_climate_act_referenced, label: "SE Climate Act" },
    { val: et?.framework_alignment?.eu_frameworks_referenced, label: "EU" },
  ];

  return (
    <button
      onClick={onClick}
      className="bg-gray-04/80 backdrop-blur-sm rounded-xl p-5 text-left hover:bg-gray-03/50 transition-colors flex-1 min-w-[280px]"
    >
      <div className="text-lg font-semibold text-gray-01 mb-3">{m.name}</div>

      {/* Primary target — always shown for symmetry */}
      {pt?.exists ? (
        <div className="bg-green-03/10 border border-green-03/20 rounded-lg p-3 mb-3">
          <div className="text-xs text-green-03 font-medium uppercase tracking-wider mb-1">Primary target</div>
          <div className="text-2xl font-bold text-gray-01">{pt.target_year || "—"}</div>
          <Badge variant="default">{SCOPE_LABELS[pt.scope || ""] || pt.scope?.replace(/_/g, " ")}</Badge>
        </div>
      ) : (
        <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-3 mb-3 flex flex-col justify-center min-h-[88px]">
          <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">Primary target</div>
          <div className="text-lg text-gray-02">None</div>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-03">
            {biggestReduction ? `${biggestReduction.reduction_percentage}%` : "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">Max reduction</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-01">
            {ps?.temporal_scope?.plan_period_start || "—"}–{ps?.temporal_scope?.plan_period_end?.slice(-2) || "—"}
          </div>
          <div className="text-xs text-gray-02 uppercase">Plan period</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-03">
            {et?.own_commitments?.length || 0}
          </div>
          <div className="text-xs text-gray-02 uppercase">Goals</div>
        </div>
      </div>

      {/* Framework badges */}
      <div className="flex flex-wrap gap-1 mt-3">
        {frameworkFlags.map((fw) => (
          <span key={fw.label} className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            fw.val ? "bg-green-03/15 text-green-03" : "bg-gray-03/30 text-gray-02"
          )}>
            {fw.label}
          </span>
        ))}
      </div>

      <div className="text-xs text-blue-03 mt-4">View full details →</div>
    </button>
  );
}

// --- Category panels ---

function TargetsPanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const et = m.emissionTargets;
        if (!et) return <div key={m.id} className="text-gray-02 text-sm">No data</div>;

        const reductionGoals = et.own_commitments.filter((c) => c.goal_type === "emission_reduction");
        const implementationGoals = et.own_commitments.filter((c) => c.goal_type === "implementation");

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {et.primary_target?.exists ? (
              <div className="bg-green-03/10 border border-green-03/20 rounded-lg p-4">
                <div className="text-xs text-green-03 font-medium uppercase tracking-wider mb-2">Primary target</div>
                <div className="text-xl font-bold text-gray-01 mb-2">
                  {et.primary_target.reduction_percentage
                    ? `${et.primary_target.reduction_percentage}% by ${et.primary_target.target_year}`
                    : `by ${et.primary_target.target_year}`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{SCOPE_LABELS[et.primary_target.scope || ""] || et.primary_target.scope?.replace(/_/g, " ")}</Badge>
                  {et.primary_target.baseline_year && <Badge>Baseline: {et.primary_target.baseline_year}</Badge>}
                  {et.primary_target.confidence && (
                    <Badge variant={CONFIDENCE_STYLES[et.primary_target.confidence]?.variant || "default"}>
                      {et.primary_target.confidence} confidence
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-03/20 border border-gray-03/30 rounded-lg p-4 flex flex-col justify-center min-h-[100px]">
                <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">Primary target</div>
                <div className="text-lg text-gray-02">None</div>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                Reduction goals
                <Badge variant={reductionGoals.length > 0 ? "blue" : "default"}>{reductionGoals.length}</Badge>
              </div>
              {reductionGoals.length > 0
                ? reductionGoals.map((c, i) => <GoalCard key={i} c={c} />)
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">None</div>
              }
            </div>

            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">
                Implementation goals
                <Badge variant={implementationGoals.length > 0 ? "orange" : "default"}>{implementationGoals.length}</Badge>
              </div>
              {implementationGoals.length > 0
                ? implementationGoals.map((c, i) => <GoalCard key={i} c={c} />)
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">None</div>
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
  // Collect all events from all municipalities
  const events: TimelineEvent[] = [];

  municipalities.forEach((m, mi) => {
    const ts = m.planScope?.temporal_scope;
    const et = m.emissionTargets;

    if (ts?.plan_period_start) {
      events.push({ year: Number(ts.plan_period_start), label: "Plan start", type: "plan_start", municipalityIndex: mi, municipalityName: m.name });
    }
    if (ts?.plan_period_end) {
      events.push({ year: Number(ts.plan_period_end), label: "Plan end", type: "plan_end", municipalityIndex: mi, municipalityName: m.name });
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
      events.push({ year: Number(et.primary_target.target_year), label: "Primary target", type: "target", municipalityIndex: mi, municipalityName: m.name });
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
          <span>▶ Start</span>
          <span>■ End</span>
          <span>◆ Milestone</span>
          <span>★ Target</span>
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
          if (!ts) return <div key={m.id} className="text-gray-02 text-sm">No data</div>;
          return (
            <div key={m.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full", color.bg)} />
                <span className="text-sm font-medium text-gray-01">{m.name}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="blue">{ts.plan_period_start} – {ts.plan_period_end}</Badge>
                {ts.has_revision_cycle && <Badge variant="green">Has revision cycle</Badge>}
                {!ts.has_revision_cycle && <Badge>No revision cycle</Badge>}
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
  const frameworks = [
    { key: "paris_agreement_mentioned" as const, label: "Paris Agreement" },
    { key: "one_point_five_mentioned" as const, label: "1.5°C target" },
    { key: "carbon_budget_referenced" as const, label: "Carbon budget" },
    { key: "swedish_climate_act_referenced" as const, label: "Swedish Climate Act" },
    { key: "swedish_national_targets_referenced" as const, label: "Swedish national targets" },
    { key: "eu_frameworks_referenced" as const, label: "EU frameworks" },
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
                    {fw.label}
                  </span>
                );
              })}
            </div>

            {/* EU frameworks named */}
            {m.emissionTargets?.framework_alignment?.eu_frameworks_referenced && (
              <div className="mt-2">
                <div className="text-xs text-gray-02 mb-1">EU frameworks:</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.emissionTargets.framework_alignment.eu_frameworks_named?.length > 0
                    ? m.emissionTargets.framework_alignment.eu_frameworks_named.map((name, i) => (
                        <Badge key={i} variant="blue">{name}</Badge>
                      ))
                    : <Badge>Referenced (not named)</Badge>
                  }
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* External references */}
      <div>
        <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-3">External references</div>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
          {municipalities.map((m) => (
            <div key={m.id} className="space-y-2">
              {m.emissionTargets?.external_references?.length > 0
                ? m.emissionTargets.external_references.map((r, i) => (
                    <div key={i} className="bg-gray-03/30 rounded-lg p-3">
                      <div className="text-sm text-gray-01 mb-1.5">{r.reference_description}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge>{r.source_organization}</Badge>
                        <Badge variant="blue">{r.target_value}</Badge>
                      </div>
                    </div>
                  ))
                : <div className="bg-gray-03/20 rounded-lg p-3 text-sm text-gray-02 min-h-[52px] flex items-center">None</div>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopePanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const pd = m.planScope?.policy_domain;
        const ss = m.planScope?.spatial_scope;
        if (!pd && !ss) return <div key={m.id} className="text-gray-02 text-sm">No data</div>;
        const focus = FOCUS_LABELS[pd?.primary_focus || ""];
        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Focus</span>
                {focus
                  ? <div className="flex flex-wrap gap-1.5">{focus.badges.map((b, i) => <Badge key={i} variant={b.variant}>{b.label}</Badge>)}</div>
                  : <Badge>{pd?.primary_focus?.replace(/_/g, " ") || "—"}</Badge>
                }
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Spatial scope</span>
                <Badge variant="blue">{SCOPE_LABELS[ss?.primary_scope || ""] || ss?.primary_scope?.replace(/_/g, " ") || "—"}</Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Operations vs territory</span>
                <YesNoBadge value={ss?.distinguishes_operations_vs_territory || false} />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Regional alignment</span>
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
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}>
      {municipalities.map((m) => {
        const ea = m.emissionTargets?.emissions_accounting;
        const su = m.emissionTargets?.summary;
        if (!ea) return <div key={m.id} className="text-gray-02 text-sm">No data</div>;

        const accountingInfo = ACCOUNTING_TYPE_LABELS[ea.accounting_type] || {
          label: ea.accounting_type?.replace(/_/g, " "),
          badges: [ea.accounting_type?.replace(/_/g, " ") || "Unknown"],
        };

        return (
          <div key={m.id} className="space-y-4">
            <div className="text-sm font-medium text-gray-01">{m.name}</div>

            {/* Accounting type as badges */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">Accounting approach</div>
              <div className="flex flex-wrap gap-1.5">
                {accountingInfo.badges.map((b, i) => (
                  <Badge key={i} variant="blue">{b}</Badge>
                ))}
              </div>
            </div>

            {/* GHG scopes */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-2">GHG scopes covered</div>
              <ScopeBadges explicit={su?.ghg_scopes_explicit} implicit={su?.ghg_scopes_implicit} />
            </div>

            {/* Boolean checks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Consumption-based</span>
                <YesNoBadge value={ea.includes_consumption_based} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-02 shrink-0">Methodology described</span>
                <YesNoBadge value={ea.methodology_described} />
              </div>
            </div>

            {/* Methodology reference */}
            <div>
              <div className="text-xs text-gray-02 font-medium uppercase tracking-wider mb-1">Data source</div>
              {ea.methodology_reference
                ? <Badge>{ea.methodology_reference}</Badge>
                : <Badge>Not specified</Badge>
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
  const hasReduction = c.reduction_percentage && c.reduction_percentage !== "";
  const hasAbsolute = c.absolute_target && c.absolute_target !== "";
  const strength = STRENGTH_LABELS[c.commitment_strength];

  return (
    <div className="bg-gray-03/30 rounded-lg p-3 mb-2">
      <div className="text-sm text-gray-01 mb-2">{c.goal_description}</div>
      <div className="flex flex-wrap gap-1.5">
        {hasReduction && <Badge variant="blue">{c.reduction_percentage}%</Badge>}
        {hasAbsolute && <Badge variant="blue">{c.absolute_target}</Badge>}
        {c.target_year && <Badge>Target: {c.target_year}</Badge>}
        {c.baseline_year && <Badge>Base: {c.baseline_year}</Badge>}
        {c.sector && <Badge variant="orange">{c.sector}</Badge>}
        {c.ghg_scopes_explicit?.length > 0 && <Badge>Scope {c.ghg_scopes_explicit.join("+")}</Badge>}
        {c.ghg_scopes_implicit?.length > 0 && <Badge>Scope {c.ghg_scopes_implicit.join("+")} (implicit)</Badge>}
        {strength && <Badge variant={strength.variant}>{strength.label}</Badge>}
        {c.scope && <Badge>{SCOPE_LABELS[c.scope] || c.scope.replace(/_/g, " ")}</Badge>}
      </div>
    </div>
  );
}

// --- Main ---

export function CompareView({ municipalities, onSelectMunicipality }: CompareViewProps) {
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
          Compare in detail
        </div>
        {CATEGORIES.map((cat) => (
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
                <span className="text-sm font-medium text-gray-01">{cat.label}</span>
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
