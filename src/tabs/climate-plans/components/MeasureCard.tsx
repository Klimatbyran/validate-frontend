import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Measure,
  ActivityShift,
  TransitionElementCandidate,
  TransitionElementMatch,
} from "../lib/measures-types";
import {
  ActivityTag,
  ConfidenceBadge,
  CONFIDENCE_ORDER,
  InterventionTypeTag,
  ScoreBadge,
  ScoreBar,
  type MeasureDimension,
} from "./measure-score-ui";

function InterventionComponents({
  who,
  when,
  what,
  how,
}: {
  who: string;
  when: string;
  what: string;
  how: string;
}) {
  const fields = [
    { label: "Who", value: who },
    { label: "When", value: when },
    { label: "What", value: what },
    { label: "How", value: how },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {fields.map(({ label, value }) => {
        const present = value && value !== "none";
        return (
          <div
            key={label}
            className={cn(
              "rounded-lg px-3 py-2 text-sm border",
              present
                ? "bg-green-03/10 border-green-03/20"
                : "bg-gray-03/20 border-gray-03/30",
            )}
          >
            <span
              className={cn(
                "font-semibold mr-2",
                present ? "text-green-03" : "text-gray-02",
              )}
            >
              {label}
            </span>
            <span className={present ? "text-gray-01" : "text-gray-02/50"}>
              {present ? value : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TaxonomyCandidate({
  candidate,
  compact = false,
}: {
  candidate: TransitionElementCandidate;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="shrink-0 tabular-nums text-gray-02/60 font-mono w-9 text-right">
        {candidate.score.toFixed(2)}
      </span>
      <div className="min-w-0">
        <div className="text-gray-01 font-medium leading-snug">
          {candidate.short_label}
        </div>
        <div className="text-gray-02/60 leading-snug mt-0.5 truncate">
          {candidate.sector_path}
        </div>
        {!compact && candidate.description && (
          <div className="text-gray-02/80 leading-snug mt-0.5">
            {candidate.description}
          </div>
        )}
      </div>
    </div>
  );
}

function TaxonomyMatch({ match }: { match: TransitionElementMatch }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <ConfidenceBadge confidence={match.match_confidence} />
      <div className="min-w-0">
        <div className="text-gray-01 font-medium leading-snug">
          {match.short_label}
        </div>
        <div className="text-gray-02/60 leading-snug mt-0.5">
          {match.sector_path}
        </div>
        {match.description && (
          <div className="text-gray-02/80 leading-snug mt-0.5">
            {match.description}
          </div>
        )}
      </div>
    </div>
  );
}

function sortedMatches(
  matches: TransitionElementMatch[],
): TransitionElementMatch[] {
  return [...matches].sort(
    (a, b) =>
      CONFIDENCE_ORDER[b.match_confidence] -
      CONFIDENCE_ORDER[a.match_confidence],
  );
}

function ShiftDetail({ shift }: { shift: ActivityShift }) {
  const [expanded, setExpanded] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const hasMatches = shift.transition_element_matches.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        expanded
          ? "border-gray-03/50 bg-gray-05/60"
          : "border-gray-03/30 bg-gray-05/40",
      )}
    >
      <button
        className="w-full text-left p-3 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-01 capitalize">
              {shift.activity}
            </span>
            <span className="text-xs text-gray-02 bg-gray-03/30 rounded px-2 py-0.5">
              {shift.type}
            </span>
            {hasMatches && (
              <span className="text-xs text-green-03 bg-green-03/10 border border-green-03/20 rounded px-2 py-0.5">
                {shift.transition_element_matches.length} match
                {shift.transition_element_matches.length !== 1 ? "es" : ""}
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
                <div className="text-xs text-gray-02 font-medium mb-0.5">
                  {label}
                </div>
                <div className="text-gray-01">{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreBadge score={shift.score} />
          <div className="text-gray-02">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-03/20 px-3 pb-3 pt-3 space-y-3">
          {shift.reasoning && (
            <p className="text-sm text-gray-02 italic">{shift.reasoning}</p>
          )}

          {shift.transition_element_suggested_new && (
            <div className="text-sm bg-orange-03/10 border border-orange-03/20 rounded-lg px-3 py-2">
              <span className="text-orange-03 font-semibold">
                Suggested new TE:{" "}
              </span>
              <span className="text-gray-01">
                {shift.transition_element_suggested_new.description}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-01">
              Taxonomy matches
            </div>
            {hasMatches ? (
              sortedMatches(shift.transition_element_matches).map((m) => (
                <div
                  key={m.stable_id}
                  className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-2.5"
                >
                  <TaxonomyMatch match={m} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-02/70 italic">None confirmed.</p>
            )}
          </div>

          {shift.transition_element_candidates.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCandidates((v) => !v);
                }}
                className="flex items-center gap-1.5 text-sm text-gray-02 hover:text-gray-01 transition-colors"
              >
                {showCandidates ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showCandidates ? "Hide" : "Show"} candidates (
                {shift.transition_element_candidates.length})
              </button>
              {showCandidates && (
                <div className="space-y-2">
                  {shift.transition_element_candidates.map((c) => (
                    <TaxonomyCandidate
                      key={c.stable_id}
                      candidate={c}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MeasureCard({
  measure,
  dimension,
  rank,
}: {
  measure: Measure;
  dimension: MeasureDimension;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const score =
    dimension === "activity"
      ? measure.activity_shift_score
      : measure.intervention_score;

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
            {dimension === "activity" && (
              <ActivityTag activity={measure.activity} />
            )}
            {dimension === "intervention" && (
              <InterventionTypeTag type={measure.intervention_type} />
            )}
          </div>
        </div>
        <div className="shrink-0 text-gray-02 mt-2">
          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
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
                <p className="text-sm text-gray-02 italic">
                  No activity shift identified.
                </p>
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
  );
}
