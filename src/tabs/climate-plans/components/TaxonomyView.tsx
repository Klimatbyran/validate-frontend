import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Measure,
  ActivityShift,
  TransitionElementMatch,
  MatchConfidence,
  MunicipalityMeasures,
} from "../lib/measures-types";
import {
  ConfidenceBadge,
  CONFIDENCE_ORDER,
  ScoreBar,
  scoreClasses,
} from "./measure-score-ui";

interface TEHit {
  municipalityId: string;
  municipalityName: string;
  measure: Measure;
  shift: ActivityShift;
  match_confidence: MatchConfidence;
}

interface TEGroup {
  element: TransitionElementMatch;
  hits: TEHit[];
}

function buildTEIndex(allData: MunicipalityMeasures[]): Map<string, TEGroup> {
  const index = new Map<string, TEGroup>();

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
          };
          const existing = index.get(el.stable_id);
          if (existing) {
            existing.hits.push(hit);
          } else {
            index.set(el.stable_id, { element: el, hits: [hit] });
          }
        }
      }
    }
  }

  return index;
}

function uniqueMunicipalities(hits: TEHit[]): string[] {
  return [...new Set(hits.map((h) => h.municipalityId))];
}

function ShiftSummary({
  shift,
  measure,
}: {
  shift: ActivityShift;
  measure: Measure;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          { label: "From", value: shift.shift_from },
          { label: "To", value: shift.shift_to },
          { label: "Need", value: shift.need },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-gray-02 font-medium mb-0.5 text-xs uppercase tracking-wide">
              {label}
            </div>
            <div className="text-gray-01">{value || "—"}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-02">Shift score</span>
        <ScoreBar score={shift.score} />
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            scoreClasses(shift.score),
          )}
        >
          {shift.score}/7
        </span>
        <span className="text-gray-03/60">·</span>
        <span className="text-xs text-gray-02">Intervention</span>
        <ScoreBar score={measure.intervention_score} />
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            scoreClasses(measure.intervention_score),
          )}
        >
          {measure.intervention_score}/7
        </span>
      </div>
      {(measure.intervention_who !== "none" ||
        measure.intervention_what !== "none") && (
        <div className="flex gap-3 flex-wrap text-sm">
          {measure.intervention_who !== "none" && (
            <span>
              <span className="text-gray-02 font-medium">Who: </span>
              <span className="text-gray-01">{measure.intervention_who}</span>
            </span>
          )}
          {measure.intervention_what !== "none" && (
            <span>
              <span className="text-gray-02 font-medium">What: </span>
              <span className="text-gray-01">{measure.intervention_what}</span>
            </span>
          )}
          {measure.intervention_how !== "none" && (
            <span>
              <span className="text-gray-02 font-medium">How: </span>
              <span className="text-gray-01">{measure.intervention_how}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TEGroupCard({ group }: { group: TEGroup }) {
  const [expanded, setExpanded] = useState(false);
  const muniIds = uniqueMunicipalities(group.hits);

  const byMuni = useMemo(() => {
    const sorted = [...group.hits].sort(
      (a, b) =>
        CONFIDENCE_ORDER[b.match_confidence] -
        CONFIDENCE_ORDER[a.match_confidence],
    );
    const map = new Map<string, { name: string; hits: TEHit[] }>();
    for (const hit of sorted) {
      const existing = map.get(hit.municipalityId);
      if (existing) {
        existing.hits.push(hit);
      } else {
        map.set(hit.municipalityId, {
          name: hit.municipalityName,
          hits: [hit],
        });
      }
    }
    return [...map.values()];
  }, [group.hits]);

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
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-01">
            {group.element.short_label}
          </div>
          <div className="text-sm text-gray-02 mt-0.5">
            {group.element.sector_path}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-gray-02">
              <span className="font-semibold text-gray-01">
                {muniIds.length}
              </span>{" "}
              {muniIds.length === 1 ? "municipality" : "municipalities"}
            </span>
            <span className="text-gray-03/60">·</span>
            <span className="text-sm text-gray-02">
              <span className="font-semibold text-gray-01">
                {group.hits.length}
              </span>{" "}
              {group.hits.length === 1 ? "statement" : "statements"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-gray-02 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
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
                <div
                  key={i}
                  className="ml-4 rounded-lg border border-gray-03/30 bg-gray-05/40 p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <ConfidenceBadge confidence={hit.match_confidence} />
                    <p className="text-sm text-gray-01 leading-snug italic">
                      "{hit.measure.measure_text}"
                    </p>
                  </div>
                  <ShiftSummary shift={hit.shift} measure={hit.measure} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaxonomyView({ data }: { data: MunicipalityMeasures[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const index = buildTEIndex(data);
    return [...index.values()].sort((a, b) => {
      const muniDiff =
        uniqueMunicipalities(b.hits).length -
        uniqueMunicipalities(a.hits).length;
      return muniDiff !== 0 ? muniDiff : b.hits.length - a.hits.length;
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter(
      (g) =>
        g.element.short_label.toLowerCase().includes(q) ||
        g.element.description.toLowerCase().includes(q) ||
        g.element.sector_path.toLowerCase().includes(q) ||
        g.element.stable_id.toLowerCase().includes(q),
    );
  }, [groups, query]);

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
          No taxonomy matches yet. Populate{" "}
          <code className="font-mono text-xs">transition_element_matches</code>{" "}
          in your measures data to see cross-municipality connections here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-02 text-center py-10">
          No elements match your search.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((group) => (
            <TEGroupCard key={group.element.stable_id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
