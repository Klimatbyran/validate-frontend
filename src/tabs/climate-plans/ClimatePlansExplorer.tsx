import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Callout } from "@/ui/callout"
import { SectionCard, SectionCardHeader, SectionCardBody } from "@/ui/section-card"
import { useMeasures } from "./hooks/useMeasures"
import type { Measure, ActivityShift, TransitionElementCandidate } from "./lib/measures-types"

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreClasses(score: number): string {
  if (score <= 1) return "bg-gray-03/40 text-gray-02"
  if (score <= 2) return "bg-pink-03/20 text-pink-03"
  if (score <= 3) return "bg-orange-03/20 text-orange-03"
  if (score <= 4) return "bg-orange-03/30 text-orange-03"
  if (score <= 5) return "bg-blue-03/20 text-blue-03"
  if (score <= 6) return "bg-green-03/20 text-green-03"
  return "bg-green-03/40 text-green-03"
}

function scoreBarClasses(score: number): string {
  if (score <= 1) return "bg-gray-03/60"
  if (score <= 2) return "bg-pink-03/60"
  if (score <= 3) return "bg-orange-03/60"
  if (score <= 4) return "bg-orange-03/80"
  if (score <= 5) return "bg-blue-03/80"
  if (score <= 6) return "bg-green-03/60"
  return "bg-green-03"
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full text-base font-bold shrink-0 tabular-nums",
        scoreClasses(score),
      )}
      title={`Score: ${score}/7`}
    >
      {score}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-5 rounded-full transition-colors",
            i < score ? scoreBarClasses(score) : "bg-gray-03/30",
          )}
        />
      ))}
    </div>
  )
}

// ─── Tag components ───────────────────────────────────────────────────────────

function ActivityTag({ activity }: { activity: string }) {
  if (!activity || activity === "none") return null
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-03/10 text-blue-03 border border-blue-03/20 capitalize">
      {activity.replace(/_/g, " ")}
    </span>
  )
}

function InterventionTypeTag({ type }: { type: string }) {
  if (!type || type === "none") return null
  const colors: Record<string, string> = {
    direct: "bg-green-03/15 text-green-03 border-green-03/20",
    indirect: "bg-blue-03/15 text-blue-03 border-blue-03/20",
    enabling: "bg-orange-03/15 text-orange-03 border-orange-03/20",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border capitalize",
        colors[type] ?? "bg-gray-03/30 text-gray-02 border-gray-03/20",
      )}
    >
      {type}
    </span>
  )
}

// ─── Intervention breakdown ───────────────────────────────────────────────────

function InterventionComponents({ who, when, what, how }: { who: string; when: string; what: string; how: string }) {
  const fields = [
    { label: "Who", value: who },
    { label: "When", value: when },
    { label: "What", value: what },
    { label: "How", value: how },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {fields.map(({ label, value }) => {
        const present = value && value !== "none"
        return (
          <div
            key={label}
            className={cn(
              "rounded-lg px-3 py-2 text-sm border",
              present ? "bg-green-03/10 border-green-03/20" : "bg-gray-03/20 border-gray-03/30",
            )}
          >
            <span className={cn("font-semibold mr-2", present ? "text-green-03" : "text-gray-02")}>
              {label}
            </span>
            <span className={present ? "text-gray-01" : "text-gray-02/50"}>
              {present ? value : "—"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Taxonomy candidate row ───────────────────────────────────────────────────

function TaxonomyCandidate({ candidate, compact = false }: { candidate: TransitionElementCandidate; compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="shrink-0 tabular-nums text-gray-02/60 font-mono w-9 text-right">
        {candidate.score.toFixed(2)}
      </span>
      <div className="min-w-0">
        <div className="text-gray-01 font-medium leading-snug">{candidate.short_label}</div>
        <div className="text-gray-02/60 leading-snug mt-0.5 truncate">{candidate.sector_path}</div>
        {!compact && candidate.description && (
          <div className="text-gray-02/80 leading-snug mt-0.5">{candidate.description}</div>
        )}
      </div>
    </div>
  )
}

// ─── Activity shift detail block ──────────────────────────────────────────────

function ShiftDetail({ shift }: { shift: ActivityShift }) {
  const [showCandidates, setShowCandidates] = useState(false)
  const top3candidates = shift.transition_element_candidates.slice(0, 3)
  const restCandidates = shift.transition_element_candidates.slice(3)
  const hasMatches = shift.transition_element_matches.length > 0

  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-05/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-gray-01 capitalize">{shift.activity}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-02">{shift.type}</span>
          <ScoreBadge score={shift.score} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: "From", value: shift.shift_from },
          { label: "To", value: shift.shift_to },
          { label: "Need", value: shift.need },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-gray-02 font-medium mb-1">{label}</div>
            <div className="text-gray-01">{value || "—"}</div>
          </div>
        ))}
      </div>

      {shift.reasoning && (
        <p className="text-sm text-gray-02 italic border-t border-gray-03/20 pt-3">
          {shift.reasoning}
        </p>
      )}

      {shift.transition_element_suggested_new && (
        <div className="text-sm bg-orange-03/10 border border-orange-03/20 rounded-lg px-3 py-2">
          <span className="text-orange-03 font-semibold">Suggested new TE: </span>
          <span className="text-gray-01">{shift.transition_element_suggested_new.description}</span>
        </div>
      )}

      {/* Taxonomy matches — primary, always visible */}
      <div className="border-t border-gray-03/20 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-01">Taxonomy matches</div>
          {!hasMatches && (
            <span className="text-xs text-gray-02 bg-gray-03/30 rounded px-2 py-0.5">none</span>
          )}
        </div>
        {hasMatches ? (
          <div className="space-y-2">
            {shift.transition_element_matches.map((c) => (
              <div key={c.stable_id} className="rounded-lg border border-green-03/30 bg-green-03/5 p-2.5">
                <TaxonomyCandidate candidate={c} compact={false} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-02/70 italic">No confirmed taxonomy match — see candidates below.</p>
        )}
      </div>

      {/* Taxonomy candidates — secondary, collapsed by default */}
      {shift.transition_element_candidates.length > 0 && (
        <div className="border-t border-gray-03/20 pt-3 space-y-2">
          <button
            onClick={() => setShowCandidates((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-02 hover:text-gray-01 transition-colors"
          >
            {showCandidates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="font-medium">
              {showCandidates ? "Hide" : "Show"} candidates ({shift.transition_element_candidates.length})
            </span>
          </button>
          {showCandidates && (
            <div className="space-y-2 pt-1">
              {top3candidates.map((c) => (
                <TaxonomyCandidate key={c.stable_id} candidate={c} compact />
              ))}
              {restCandidates.length > 0 && restCandidates.map((c) => (
                <TaxonomyCandidate key={c.stable_id} candidate={c} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Measure card ─────────────────────────────────────────────────────────────

type Dimension = "activity" | "intervention"

function MeasureCard({ measure, dimension, rank }: { measure: Measure; dimension: Dimension; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const score = dimension === "activity" ? measure.activity_shift_score : measure.intervention_score

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        expanded
          ? "border-gray-03/60 bg-gray-04/70"
          : "border-gray-03/30 bg-gray-04/40 hover:border-gray-03/50 hover:bg-gray-04/60",
      )}
    >
      <button
        className="w-full text-left p-4 flex items-start gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm text-gray-02/40 tabular-nums w-5 shrink-0 mt-2 text-right select-none">
          {rank}
        </span>
        <ScoreBadge score={score} />
        <div className="flex-1 min-w-0">
          <p className="text-base text-gray-01 leading-snug line-clamp-2">
            {measure.measure_text}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <ScoreBar score={score} />
            {dimension === "activity" && <ActivityTag activity={measure.activity} />}
            {dimension === "intervention" && <InterventionTypeTag type={measure.intervention_type} />}
          </div>
        </div>
        <div className="shrink-0 text-gray-02 mt-2">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-03/30 space-y-4">
          <p className="text-sm text-gray-01 leading-relaxed bg-gray-05/50 rounded-lg px-3 py-2.5 border border-gray-03/20">
            {measure.measure_text}
          </p>

          {dimension === "activity" && (
            <>
              {measure.activity_shifts.length === 0 ? (
                <p className="text-sm text-gray-02 italic">No activity shift identified.</p>
              ) : (
                <div className="space-y-3">
                  {measure.activity_shifts.map((shift, i) => (
                    <ShiftDetail key={i} shift={shift} />
                  ))}
                </div>
              )}
            </>
          )}

          {dimension === "intervention" && (
            <div className="space-y-3">
              <InterventionComponents
                who={measure.intervention_who}
                when={measure.intervention_when}
                what={measure.intervention_what}
                how={measure.intervention_how}
              />
              {measure.intervention_reasoning && (
                <p className="text-sm text-gray-02 italic border-t border-gray-03/20 pt-3">
                  {measure.intervention_reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Score distribution bar chart ────────────────────────────────────────────

function ScoreDistribution({ measures, dimension }: { measures: Measure[]; dimension: Dimension }) {
  const counts = useMemo(() => {
    const c = new Array(7).fill(0)
    for (const m of measures) {
      const s = dimension === "activity" ? m.activity_shift_score : m.intervention_score
      c[Math.min(Math.max(s, 1), 7) - 1]++
    }
    return c
  }, [measures, dimension])

  const max = Math.max(...counts, 1)

  return (
    <div className="flex items-end gap-1.5 h-10">
      {counts.map((count, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1 flex-1"
          title={`Score ${i + 1}: ${count} measure${count !== 1 ? "s" : ""}`}
        >
          <div
            className={cn("w-full rounded-sm", scoreBarClasses(i + 1))}
            style={{ height: `${Math.max((count / max) * 32, count > 0 ? 4 : 0)}px` }}
          />
          <span className="text-xs text-gray-02/50 tabular-nums">{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Ranked list panel ────────────────────────────────────────────────────────

type SortDir = "asc" | "desc"

function RankedList({ title, subtitle, measures, dimension, defaultSort }: {
  title: string
  subtitle: string
  measures: Measure[]
  dimension: Dimension
  defaultSort: SortDir
}) {
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort)

  const sorted = useMemo(() => {
    const key = dimension === "activity" ? "activity_shift_score" : "intervention_score"
    return [...measures].sort((a, b) => sortDir === "desc" ? b[key] - a[key] : a[key] - b[key])
  }, [measures, dimension, sortDir])

  const avg =
    measures.reduce((s, m) => s + (dimension === "activity" ? m.activity_shift_score : m.intervention_score), 0) /
    (measures.length || 1)

  return (
    <SectionCard>
      <SectionCardHeader
        title={<span className="text-base font-semibold">{title}</span>}
        subtitle={subtitle}
        right={
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-02">
              avg{" "}
              <span className={cn("font-bold tabular-nums", scoreClasses(Math.round(avg)))}>
                {avg.toFixed(1)}
              </span>
            </span>
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="flex items-center gap-1.5 text-sm text-gray-02 hover:text-gray-01 transition-colors px-2.5 py-1.5 rounded border border-gray-03/30 hover:border-gray-03/50"
            >
              {sortDir === "desc" ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              {sortDir === "desc" ? "Best first" : "Worst first"}
            </button>
          </div>
        }
      />
      <SectionCardBody className="p-4 space-y-3">
        {sorted.map((measure, i) => (
          <MeasureCard key={`${measure.measure_text.slice(0, 20)}-${i}`} measure={measure} dimension={dimension} rank={i + 1} />
        ))}
      </SectionCardBody>
    </SectionCard>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function ClimatePlansExplorer() {
  const { data, isLoading, error } = useMeasures()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const municipality = useMemo(
    () => (data.length === 0 ? null : (data.find((d) => d.id === selectedId) ?? data[0])),
    [data, selectedId],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-02">
        Loading measures data…
      </div>
    )
  }

  if (error) {
    return (
      <Callout variant="error" title="Failed to load measures">
        <p className="text-sm text-pink-03/80 mt-1">{error}</p>
      </Callout>
    )
  }

  if (!municipality) {
    return (
      <Callout variant="info" title="No data found">
        <p className="text-sm text-blue-03/80 mt-1">
          Add municipality measures JSON files to{" "}
          <code className="font-mono text-sm">public/climate-plans/measures/</code>.
        </p>
      </Callout>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-01">Climate Plan Measures</h1>
          <p className="text-sm text-gray-02 mt-1">
            Ranked by activity shift clarity and intervention specificity (1–7 scale)
          </p>
        </div>
        {data.length > 1 ? (
          <select
            value={municipality.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2 hover:border-gray-03 focus:outline-none focus:border-blue-03/50"
          >
            {data.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm font-medium text-gray-01 bg-gray-04 border border-gray-03/30 rounded px-3 py-2">
            {municipality.name}
          </span>
        )}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4">
        {(["activity", "intervention"] as const).map((dim) => {
          const count = municipality.measures.filter(
            (m) => (dim === "activity" ? m.activity_shift_score : m.intervention_score) > 1,
          ).length
          return (
            <div key={dim} className="bg-gray-04/80 rounded-lg border border-gray-03/30 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-02 uppercase tracking-wide">
                  {dim === "activity" ? "Activity Shifts" : "Interventions"}
                </span>
                <span className="text-sm text-gray-02">
                  {count}/{municipality.measures.length} present
                </span>
              </div>
              <ScoreDistribution measures={municipality.measures} dimension={dim} />
            </div>
          )
        })}
      </div>

      {/* Ranked lists — stacked vertically */}
      <RankedList
        title="Activity Shifts"
        subtitle="How clearly the measure identifies what activity changes and how"
        measures={municipality.measures}
        dimension="activity"
        defaultSort="desc"
      />
      <RankedList
        title="Interventions"
        subtitle="How specifically the measure defines who does what, when, and how"
        measures={municipality.measures}
        dimension="intervention"
        defaultSort="desc"
      />
    </div>
  )
}
