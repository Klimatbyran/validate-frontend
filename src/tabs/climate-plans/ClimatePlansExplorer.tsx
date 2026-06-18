import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Callout } from "@/ui/callout"
import { SectionCard, SectionCardHeader, SectionCardBody } from "@/ui/section-card"
import { useMeasures } from "./hooks/useMeasures"
import type { Measure, ActivityShift, TransitionElementCandidate, TransitionElementMatch, MatchConfidence, MunicipalityMeasures } from "./lib/measures-types"

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

// ─── Match confidence ─────────────────────────────────────────────────────────

const CONFIDENCE_ORDER: Record<MatchConfidence, number> = { high: 3, mid: 2, low: 1 }

const CONFIDENCE_CLASSES: Record<MatchConfidence, string> = {
  high: "bg-green-03/20 text-green-03 border-green-03/30",
  mid: "bg-blue-03/20 text-blue-03 border-blue-03/30",
  low: "bg-orange-03/20 text-orange-03 border-orange-03/30",
}

function ConfidenceBadge({ confidence }: { confidence: MatchConfidence }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize", CONFIDENCE_CLASSES[confidence])}>
      {confidence}
    </span>
  )
}

function TaxonomyMatch({ match }: { match: TransitionElementMatch }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <ConfidenceBadge confidence={match.match_confidence} />
      <div className="min-w-0">
        <div className="text-gray-01 font-medium leading-snug">{match.short_label}</div>
        <div className="text-gray-02/60 leading-snug mt-0.5">{match.sector_path}</div>
        {match.description && (
          <div className="text-gray-02/80 leading-snug mt-0.5">{match.description}</div>
        )}
      </div>
    </div>
  )
}

function sortedMatches(matches: TransitionElementMatch[]): TransitionElementMatch[] {
  return [...matches].sort((a, b) => CONFIDENCE_ORDER[b.match_confidence] - CONFIDENCE_ORDER[a.match_confidence])
}

// ─── Activity shift detail block ──────────────────────────────────────────────

function ShiftDetail({ shift }: { shift: ActivityShift }) {
  const [expanded, setExpanded] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const hasMatches = shift.transition_element_matches.length > 0

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      expanded ? "border-gray-03/50 bg-gray-05/60" : "border-gray-03/30 bg-gray-05/40",
    )}>
      {/* Always-visible summary row — clickable to expand */}
      <button
        className="w-full text-left p-3 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-01 capitalize">{shift.activity}</span>
            <span className="text-xs text-gray-02 bg-gray-03/30 rounded px-2 py-0.5">{shift.type}</span>
            {hasMatches && (
              <span className="text-xs text-green-03 bg-green-03/10 border border-green-03/20 rounded px-2 py-0.5">
                {shift.transition_element_matches.length} match{shift.transition_element_matches.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: "From", value: shift.shift_from },
              { label: "To", value: shift.shift_to },
              { label: "Need", value: shift.need },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-02 font-medium mb-0.5">{label}</div>
                <div className="text-gray-01">{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreBadge score={shift.score} />
          <div className="text-gray-02">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-03/20 px-3 pb-3 pt-3 space-y-3">
          {shift.reasoning && (
            <p className="text-sm text-gray-02 italic">{shift.reasoning}</p>
          )}

          {shift.transition_element_suggested_new && (
            <div className="text-sm bg-orange-03/10 border border-orange-03/20 rounded-lg px-3 py-2">
              <span className="text-orange-03 font-semibold">Suggested new TE: </span>
              <span className="text-gray-01">{shift.transition_element_suggested_new.description}</span>
            </div>
          )}

          {/* Taxonomy matches — sorted high → mid → low */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-01">Taxonomy matches</div>
            {hasMatches ? (
              sortedMatches(shift.transition_element_matches).map((m) => (
                <div key={m.stable_id} className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-2.5">
                  <TaxonomyMatch match={m} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-02/70 italic">None confirmed.</p>
            )}
          </div>

          {/* Candidates */}
          {shift.transition_element_candidates.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCandidates((v) => !v) }}
                className="flex items-center gap-1.5 text-sm text-gray-02 hover:text-gray-01 transition-colors"
              >
                {showCandidates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showCandidates ? "Hide" : "Show"} candidates ({shift.transition_element_candidates.length})
              </button>
              {showCandidates && (
                <div className="space-y-2">
                  {shift.transition_element_candidates.map((c) => (
                    <TaxonomyCandidate key={c.stable_id} candidate={c} compact />
                  ))}
                </div>
              )}
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

// ─── Taxonomy browser ────────────────────────────────────────────────────────

interface TEHit {
  municipalityId: string
  municipalityName: string
  measure: Measure
  shift: ActivityShift
  match_confidence: MatchConfidence
}

interface TEGroup {
  element: TransitionElementMatch
  hits: TEHit[]
}

function buildTEIndex(allData: MunicipalityMeasures[]): Map<string, TEGroup> {
  const index = new Map<string, TEGroup>()

  for (const muni of allData) {
    for (const measure of muni.measures) {
      for (const shift of measure.activity_shifts) {
        for (const el of shift.transition_element_matches) {
          const hit: TEHit = {
            municipalityId: muni.id,
            municipalityName: muni.name,
            measure,
            shift,
            match_confidence: el.match_confidence,
          }
          const existing = index.get(el.stable_id)
          if (existing) {
            existing.hits.push(hit)
          } else {
            index.set(el.stable_id, { element: el, hits: [hit] })
          }
        }
      }
    }
  }

  return index
}

function uniqueMunicipalities(hits: TEHit[]): string[] {
  return [...new Set(hits.map((h) => h.municipalityId))]
}

function ShiftSummary({ shift, measure }: { shift: ActivityShift; measure: Measure }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: "From", value: shift.shift_from },
          { label: "To", value: shift.shift_to },
          { label: "Need", value: shift.need },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-gray-02 font-medium mb-0.5 text-xs uppercase tracking-wide">{label}</div>
            <div className="text-gray-01">{value || "—"}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-02">Shift score</span>
        <ScoreBar score={shift.score} />
        <span className={cn("text-xs font-bold tabular-nums", scoreClasses(shift.score))}>{shift.score}/7</span>
        <span className="text-gray-03/60">·</span>
        <span className="text-xs text-gray-02">Intervention</span>
        <ScoreBar score={measure.intervention_score} />
        <span className={cn("text-xs font-bold tabular-nums", scoreClasses(measure.intervention_score))}>
          {measure.intervention_score}/7
        </span>
      </div>
      {/* Intervention who/what if present */}
      {(measure.intervention_who !== "none" || measure.intervention_what !== "none") && (
        <div className="flex gap-3 flex-wrap text-sm">
          {measure.intervention_who !== "none" && (
            <span><span className="text-gray-02 font-medium">Who: </span><span className="text-gray-01">{measure.intervention_who}</span></span>
          )}
          {measure.intervention_what !== "none" && (
            <span><span className="text-gray-02 font-medium">What: </span><span className="text-gray-01">{measure.intervention_what}</span></span>
          )}
          {measure.intervention_how !== "none" && (
            <span><span className="text-gray-02 font-medium">How: </span><span className="text-gray-01">{measure.intervention_how}</span></span>
          )}
        </div>
      )}
    </div>
  )
}

function TEGroupCard({ group }: { group: TEGroup }) {
  const [expanded, setExpanded] = useState(false)
  const muniIds = uniqueMunicipalities(group.hits)

  // Sort hits high → mid → low, then group by municipality
  const byMuni = useMemo(() => {
    const sorted = [...group.hits].sort(
      (a, b) => CONFIDENCE_ORDER[b.match_confidence] - CONFIDENCE_ORDER[a.match_confidence],
    )
    const map = new Map<string, { name: string; hits: TEHit[] }>()
    for (const hit of sorted) {
      const existing = map.get(hit.municipalityId)
      if (existing) {
        existing.hits.push(hit)
      } else {
        map.set(hit.municipalityId, { name: hit.municipalityName, hits: [hit] })
      }
    }
    return [...map.values()]
  }, [group.hits])

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      expanded ? "border-gray-03/60 bg-gray-04/70" : "border-gray-03/30 bg-gray-04/40 hover:border-gray-03/50 hover:bg-gray-04/60",
    )}>
      <button
        className="w-full text-left p-4 flex items-start gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-01">{group.element.short_label}</div>
          <div className="text-sm text-gray-02 mt-0.5">{group.element.sector_path}</div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-gray-02">
              <span className="font-semibold text-gray-01">{muniIds.length}</span>{" "}
              {muniIds.length === 1 ? "municipality" : "municipalities"}
            </span>
            <span className="text-gray-03/60">·</span>
            <span className="text-sm text-gray-02">
              <span className="font-semibold text-gray-01">{group.hits.length}</span>{" "}
              {group.hits.length === 1 ? "statement" : "statements"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-gray-02 mt-1">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-03/30 px-4 pb-4 pt-4 space-y-5">
          <p className="text-sm text-gray-02">{group.element.description}</p>
          {byMuni.map(({ name, hits }) => (
            <div key={name} className="space-y-3">
              <div className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-03/60 shrink-0" />
                {name}
              </div>
              {hits.map((hit, i) => (
                <div key={i} className="ml-4 rounded-lg border border-gray-03/30 bg-gray-05/40 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <ConfidenceBadge confidence={hit.match_confidence} />
                    <p className="text-sm text-gray-01 leading-snug italic">"{hit.measure.measure_text}"</p>
                  </div>
                  <ShiftSummary shift={hit.shift} measure={hit.measure} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaxonomyView({ data }: { data: MunicipalityMeasures[] }) {
  const [query, setQuery] = useState("")

  const groups = useMemo(() => {
    const index = buildTEIndex(data)
    return [...index.values()].sort((a, b) => {
      const muniDiff = uniqueMunicipalities(b.hits).length - uniqueMunicipalities(a.hits).length
      return muniDiff !== 0 ? muniDiff : b.hits.length - a.hits.length
    })
  }, [data])

  const filtered = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    return groups.filter(
      (g) =>
        g.element.short_label.toLowerCase().includes(q) ||
        g.element.description.toLowerCase().includes(q) ||
        g.element.sector_path.toLowerCase().includes(q) ||
        g.element.stable_id.toLowerCase().includes(q),
    )
  }, [groups, query])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-02/60" />
          <input
            type="text"
            placeholder="Search transition elements…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded-lg placeholder:text-gray-02/50 focus:outline-none focus:border-blue-03/50"
          />
        </div>
        <span className="text-sm text-gray-02 shrink-0">
          {filtered.length} elements
          {query && groups.length !== filtered.length && ` of ${groups.length}`}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-02 text-center py-16">
          No taxonomy matches yet. Populate <code className="font-mono text-xs">transition_element_matches</code> in your measures data to see cross-municipality connections here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-02 text-center py-10">No elements match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((group) => <TEGroupCard key={group.element.stable_id} group={group} />)}
        </div>
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

type TopView = "measures" | "taxonomy"

export function ClimatePlansExplorer() {
  const { data, isLoading, error } = useMeasures()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [topView, setTopView] = useState<TopView>("measures")

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

  if (data.length === 0) {
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
            {topView === "measures"
              ? "Ranked by activity shift clarity and intervention specificity (1–7 scale)"
              : "Browse taxonomy transition elements across all municipalities"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-03/40 overflow-hidden text-sm">
            {(["measures", "taxonomy"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTopView(v)}
                className={cn(
                  "px-4 py-2 capitalize transition-colors",
                  topView === v
                    ? "bg-gray-03/50 text-gray-01 font-medium"
                    : "text-gray-02 hover:text-gray-01 hover:bg-gray-04/60",
                )}
              >
                {v === "measures" ? "By measure" : "By taxonomy"}
              </button>
            ))}
          </div>

          {/* Municipality selector — only relevant for measures view */}
          {topView === "measures" && (
            data.length > 1 ? (
              <select
                value={municipality?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2 hover:border-gray-03 focus:outline-none focus:border-blue-03/50"
              >
                {data.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-01 bg-gray-04 border border-gray-03/30 rounded px-3 py-2">
                {data[0].name}
              </span>
            )
          )}
        </div>
      </div>

      {topView === "taxonomy" ? (
        <TaxonomyView data={data} />
      ) : municipality ? (
        <>
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

          {/* Ranked lists */}
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
        </>
      ) : null}
    </div>
  )
}
