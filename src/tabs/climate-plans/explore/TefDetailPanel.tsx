import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONFIDENCE_CLASSES } from "../lib/tef-groups";
import type { TefFrameworkCell } from "../lib/tef-framework";
import {
  hitMatchesEvidenceFilter,
  hitMatchesImpliedFilter,
  summarizeTefHits,
  type TefEvidenceFilter,
  type TefImpliedFilter,
} from "../lib/tef-detail-summary";

type Hit = TefFrameworkCell["hits"][number];

const IMPLIED_FILTER_OPTIONS: {
  value: TefImpliedFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "implied", label: "Only implied" },
  { value: "exclude-implied", label: "Exclude implied" },
];

export function TefDetailPanel({ cell }: { cell: TefFrameworkCell }) {
  const [filter, setFilter] = useState<TefEvidenceFilter>(null);
  const [impliedFilter, setImpliedFilter] = useState<TefImpliedFilter>("all");
  const [openMuni, setOpenMuni] = useState<string | null>(null);
  const [openHit, setOpenHit] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeTefHits(cell.hits, cell.municipalityCount),
    [cell.hits, cell.municipalityCount],
  );

  const hasExplicitJudgment =
    summary.explicitCount + summary.impliedCount > 0;

  const byMuni = useMemo(() => {
    const map = new Map<string, { name: string; hits: Hit[] }>();
    for (const hit of cell.hits) {
      if (!hitMatchesImpliedFilter(hit, impliedFilter)) continue;
      if (!hitMatchesEvidenceFilter(hit, filter)) continue;
      const existing = map.get(hit.municipalityId);
      if (existing) existing.hits.push(hit);
      else
        map.set(hit.municipalityId, {
          name: hit.municipalityName,
          hits: [hit],
        });
    }
    return [...map.values()].sort((a, b) => b.hits.length - a.hits.length);
  }, [cell.hits, filter, impliedFilter]);

  const description =
    cell.hits.find((h) => h.description.trim())?.description ?? "";

  const toggleFilter = (next: TefEvidenceFilter) => {
    setFilter((prev) => (prev === next ? null : next));
    setOpenMuni(null);
    setOpenHit(null);
  };

  const changeImpliedFilter = (next: TefImpliedFilter) => {
    setImpliedFilter(next);
    setOpenMuni(null);
    setOpenHit(null);
  };

  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 overflow-hidden">
      <div className="px-4 pt-4 pb-3 space-y-2 border-b border-gray-03/20">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs font-mono text-gray-02">
            {cell.index ?? cell.stableId}
          </span>
          <span className="text-xs text-gray-02">· {cell.sectorLabel}</span>
          <span className="text-xs tabular-nums text-gray-02 ml-auto">
            {cell.hitCount} hits · {cell.municipalityCount} places ·{" "}
            {Math.round(cell.weightedStrength * 100)}% strength
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-01 leading-snug">
          {cell.title}
        </h3>
        {description ? (
          <p className="text-sm text-gray-02 leading-snug line-clamp-2">
            {description}
          </p>
        ) : null}
      </div>

      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-03/20 bg-gray-05/30">
        <FillMeters summary={summary} filter={filter} onToggle={toggleFilter} />
        <ScoreBalance summary={summary} />
        <ConfidenceStrip
          summary={summary}
          filter={filter}
          onToggle={toggleFilter}
        />
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
              Evidence
            </div>
            {hasExplicitJudgment ? (
              <div
                className="flex rounded-md overflow-hidden border border-gray-03/40 text-xs"
                role="group"
                aria-label="Filter by explicit vs implied match"
              >
                {IMPLIED_FILTER_OPTIONS.map(({ value, label }) => {
                  const count =
                    value === "all"
                      ? summary.hitCount
                      : value === "implied"
                        ? summary.impliedCount
                        : summary.hitCount - summary.impliedCount;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeImpliedFilter(value)}
                      className={cn(
                        "px-2.5 py-1 transition-colors",
                        impliedFilter === value
                          ? "bg-gray-03/50 text-gray-01 font-medium"
                          : "text-gray-02 hover:text-gray-01",
                      )}
                      aria-pressed={impliedFilter === value}
                    >
                      {label}
                      <span className="ml-1 tabular-nums opacity-80">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {filter ? (
            <button
              type="button"
              onClick={() => toggleFilter(null)}
              className="text-xs text-blue-03 hover:underline"
            >
              Clear filter
            </button>
          ) : (
            <span className="text-xs text-gray-02">
              {hasExplicitJudgment
                ? [
                    `${summary.explicitCount} explicit`,
                    `${summary.impliedCount} implied`,
                    summary.unknownExplicitCount > 0
                      ? `${summary.unknownExplicitCount} unlabeled`
                      : null,
                    "expand a place for quotes",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Click a chip above to filter · expand a place for quotes"}
            </span>
          )}
        </div>

        {byMuni.length === 0 ? (
          <p className="text-sm text-gray-02 italic py-2">
            No matches for this filter.
          </p>
        ) : (
          byMuni.map(({ name, hits }) => {
            const id = hits[0]?.municipalityId ?? name;
            const expanded = openMuni === id;
            return (
              <div
                key={id}
                className="rounded-md border border-gray-03/25 bg-gray-05/40"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMuni(expanded ? null : id);
                    setOpenHit(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-03/15 transition-colors"
                >
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-02 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-02 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-01 flex-1 truncate">
                    {name}
                  </span>
                  <MuniMiniBars hits={hits} />
                  <span className="text-xs tabular-nums text-gray-02 shrink-0">
                    {hits.length}
                  </span>
                </button>
                {expanded ? (
                  <ul className="border-t border-gray-03/20 divide-y divide-gray-03/15">
                    {hits.map((hit, i) => {
                      const hitKey = `${id}-${i}`;
                      return (
                        <HitRow
                          key={hitKey}
                          hit={hit}
                          expanded={openHit === hitKey}
                          onToggle={() =>
                            setOpenHit((prev) =>
                              prev === hitKey ? null : hitKey,
                            )
                          }
                        />
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FillMeters({
  summary,
  filter,
  onToggle,
}: {
  summary: ReturnType<typeof summarizeTefHits>;
  filter: TefEvidenceFilter;
  onToggle: (f: TefEvidenceFilter) => void;
}) {
  const rows = [
    {
      key: "who" as const,
      label: "Who",
      filled: summary.whoFilled,
      color: "bg-green-03",
    },
    {
      key: "what" as const,
      label: "What",
      filled: summary.whatFilled,
      color: "bg-blue-03",
    },
    {
      key: "how" as const,
      label: "How",
      filled: summary.howFilled,
      color: "bg-orange-03",
    },
  ];
  const total = Math.max(summary.hitCount, 1);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
        Intervention fill
      </div>
      {rows.map((row) => {
        const active = filter === row.key;
        const pct = Math.round((row.filled / total) * 100);
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => onToggle(row.key)}
            className={cn(
              "w-full text-left rounded-md px-2 py-1.5 transition-colors",
              active
                ? "bg-gray-03/40 ring-1 ring-gray-03/50"
                : "hover:bg-gray-03/20",
            )}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-01">{row.label}</span>
              <span className="tabular-nums text-gray-02">
                {row.filled}/{summary.hitCount}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-03/30 overflow-hidden">
              <div
                className={cn("h-full rounded-full", row.color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ScoreBalance({
  summary,
}: {
  summary: ReturnType<typeof summarizeTefHits>;
}) {
  const shift = summary.avgShiftScore;
  const intervention = summary.avgInterventionScore;
  const lean = summary.interventionLean ?? 0.5;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
        Shift ↔ intervention
      </div>
      {shift == null || intervention == null ? (
        <p className="text-sm text-gray-02 italic">No scores</p>
      ) : (
        <>
          <div className="flex justify-between text-xs tabular-nums">
            <span>
              <span className="text-gray-02">Shift </span>
              <span className="font-semibold text-blue-03">
                {shift.toFixed(1)}
              </span>
              <span className="text-gray-02">/7</span>
            </span>
            <span>
              <span className="text-gray-02">Interv. </span>
              <span className="font-semibold text-green-03">
                {intervention.toFixed(1)}
              </span>
              <span className="text-gray-02">/7</span>
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-03/35 via-gray-03/25 to-green-03/35">
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gray-01 border-2 border-gray-05 shadow-sm"
              style={{ left: `${Math.round(lean * 100)}%` }}
              title={
                lean < 0.45
                  ? "Stronger as activity shifts"
                  : lean > 0.55
                    ? "Stronger as interventions"
                    : "Balanced"
              }
            />
          </div>
          <p className="text-[11px] text-gray-02 leading-snug">
            {lean < 0.45
              ? "Clearer as activity shifts than as interventions"
              : lean > 0.55
                ? "Clearer as interventions than as activity shifts"
                : "Similar shift and intervention clarity"}
          </p>
          <div className="space-y-1 pt-0.5">
            <MiniScoreBar label="Shift" value={shift} color="bg-blue-03" />
            <MiniScoreBar
              label="Interv."
              value={intervention}
              color="bg-green-03"
            />
          </div>
        </>
      )}
    </div>
  );
}

function MiniScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-10 text-gray-02 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-03/30 overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.round((value / 7) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceStrip({
  summary,
  filter,
  onToggle,
}: {
  summary: ReturnType<typeof summarizeTefHits>;
  filter: TefEvidenceFilter;
  onToggle: (f: TefEvidenceFilter) => void;
}) {
  const total = Math.max(summary.hitCount, 1);
  const parts = (
    [
      ["high", "bg-green-03", summary.confidence.high],
      ["mid", "bg-blue-03", summary.confidence.mid],
      ["low", "bg-orange-03", summary.confidence.low],
    ] as const
  ).filter(([, , count]) => count > 0);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
        Match confidence
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-03/30">
        {parts.map(([key, color, count]) => (
          <div
            key={key}
            className={color}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${key}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["high", "mid", "low"] as const).map((key) => {
          const count = summary.confidence[key];
          if (count === 0) return null;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize transition-colors",
                CONFIDENCE_CLASSES[key],
                active && "ring-2 ring-gray-01/30",
              )}
            >
              {key}
              <span className="tabular-nums font-normal opacity-80">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MuniMiniBars({ hits }: { hits: Hit[] }) {
  const avgShift =
    hits.reduce((s, h) => s + h.shiftScore, 0) / Math.max(hits.length, 1);
  const avgInt =
    hits.reduce((s, h) => s + h.interventionScore, 0) /
    Math.max(hits.length, 1);
  return (
    <div className="hidden sm:flex items-center gap-1 shrink-0" title="Avg shift / intervention">
      <span className="w-8 h-1 rounded-full bg-gray-03/30 overflow-hidden">
        <span
          className="block h-full bg-blue-03"
          style={{ width: `${(avgShift / 7) * 100}%` }}
        />
      </span>
      <span className="w-8 h-1 rounded-full bg-gray-03/30 overflow-hidden">
        <span
          className="block h-full bg-green-03"
          style={{ width: `${(avgInt / 7) * 100}%` }}
        />
      </span>
    </div>
  );
}

function ExplicitBadge({ explicit }: { explicit: boolean | undefined }) {
  if (explicit === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide",
        explicit
          ? "border-green-03/40 bg-green-03/10 text-green-03"
          : "border-gray-03 bg-gray-03/50 text-gray-01",
      )}
      title={
        explicit
          ? "The measure's own text directly names this TEF"
          : "Only a reasonable inference — not directly named by the measure's text"
      }
    >
      {explicit ? "explicit" : "implied"}
    </span>
  );
}

function HitRow({
  hit,
  expanded,
  onToggle,
}: {
  hit: Hit;
  expanded: boolean;
  onToggle: () => void;
}) {
  const whoWhatHow = [
    { label: "Who", value: hit.interventionWho },
    { label: "What", value: hit.interventionWhat },
    { label: "How", value: hit.interventionHow },
  ].filter(({ value }) => value && value !== "none");

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2 hover:bg-gray-03/10 transition-colors space-y-1"
      >
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap items-center gap-1 shrink-0 mt-0.5 max-w-[7.5rem]">
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border capitalize",
                CONFIDENCE_CLASSES[hit.confidence],
              )}
            >
              {hit.confidence}
            </span>
            <ExplicitBadge explicit={hit.explicit} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p
              className={cn(
                "text-sm text-gray-01 leading-snug",
                !expanded && "line-clamp-1",
              )}
            >
              <span className="italic">“{hit.measureText}”</span>
            </p>
            {!expanded ? (
              <div className="text-xs text-gray-02 truncate">
                {[hit.shiftFrom, hit.shiftTo].filter(Boolean).join(" → ") ||
                  "—"}
                {hit.need ? ` · ${hit.need}` : ""}
              </div>
            ) : null}
          </div>
          <span className="text-[11px] tabular-nums text-gray-02 shrink-0 mt-0.5">
            <span className="text-blue-03">{hit.shiftScore}</span>
            <span className="text-gray-03/70">/</span>
            <span className="text-green-03">{hit.interventionScore}</span>
          </span>
        </div>
      </button>
      {expanded ? (
        <div className="px-3 pb-3 flex items-start gap-2">
          <div className="w-[7.5rem] shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "From", value: hit.shiftFrom },
                { label: "To", value: hit.shiftTo },
                { label: "Need", value: hit.need },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md bg-gray-04/60 border border-gray-03/20 px-2 py-1.5"
                >
                  <div className="text-[10px] uppercase tracking-wide text-gray-02 mb-0.5">
                    {label}
                  </div>
                  <div className="text-gray-01 leading-snug">
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>
            {whoWhatHow.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {whoWhatHow.map(({ label, value }) => (
                  <span
                    key={label}
                    className="inline-flex items-baseline gap-1 rounded-md bg-green-03/10 border border-green-03/20 px-2 py-1 text-xs"
                  >
                    <span className="font-semibold text-green-03">{label}</span>
                    <span className="text-gray-01">{value}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-02 italic">
                No who / what / how filled
              </p>
            )}
          </div>
          <div className="w-8 shrink-0" aria-hidden />
        </div>
      ) : null}
    </li>
  );
}
