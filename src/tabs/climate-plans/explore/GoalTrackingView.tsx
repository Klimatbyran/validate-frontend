import { MethodologyPanel } from "./MethodologyPanel";
import {
  trackMunicipalityGoals,
  type GoalTrackStatus,
} from "../lib/explore-goals";
import type { ExploreDataset } from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<GoalTrackStatus, string> = {
  "on-track": "On track",
  "off-track": "Off track",
  ahead: "Ahead",
  "too-early": "Too early",
  "missing-emissions": "No emissions series",
  "not-quantified": "Not quantified",
};

const STATUS_CLASS: Record<GoalTrackStatus, string> = {
  "on-track": "bg-green-03/15 text-green-03 border-green-03/30",
  ahead: "bg-blue-03/15 text-blue-03 border-blue-03/30",
  "off-track": "bg-pink-03/15 text-pink-03 border-pink-03/30",
  "too-early": "bg-gray-03/30 text-gray-02 border-gray-03/30",
  "missing-emissions": "bg-orange-03/15 text-orange-03 border-orange-03/30",
  "not-quantified": "bg-gray-03/20 text-gray-02 border-gray-03/30",
};

export function GoalTrackingView({
  dataset,
  selectedName,
  onSelectName,
}: {
  dataset: ExploreDataset;
  selectedName: string | null;
  onSelectName: (name: string) => void;
}) {
  const selected =
    dataset.municipalities.find((row) =>
      namesMatch(row.name, selectedName ?? ""),
    ) ??
    dataset.municipalities.find((row) => row.goals.length > 0) ??
    dataset.municipalities[0] ??
    null;
  const nowYear = new Date().getFullYear();
  const rows = selected
    ? trackMunicipalityGoals(selected, dataset.sectorEmissions, nowYear)
    : [];

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="Goals: emission_targets.own_commitments (static JSON today). Trajectory: sum of territorial sector tonnes for the closest year to baseline_year and to now."
        calculation="If a goal has reduction_percentage, baseline_year, and target_year: expected remaining share = 1 − (p/100) × elapsed, elapsed = (latest−baseline)/(target−baseline). Actual remaining = latest total / baseline total. Off-track if actual remaining is >5pp above the linear path; ahead if >5pp below."
        extra="Territorial SMHI totals are a poor proxy for municipal-operations (scope 1+2) goals — those rows will often look 'off track' or 'missing'. That is intentional: it shows which goals we can actually score with public emissions today."
      />
      <select
        value={selected?.name ?? ""}
        onChange={(e) => onSelectName(e.target.value)}
        className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
      >
        {dataset.municipalities.map((row) => (
          <option key={row.id} value={row.name}>
            {row.name} ({row.goals.length} goals)
          </option>
        ))}
      </select>
      {selected && rows.length === 0 ? (
        <p className="text-sm text-gray-02">
          No own_commitments extracted for this municipality yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <GoalCard key={`${row.goal.description}-${i}`} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  row,
}: {
  row: ReturnType<typeof trackMunicipalityGoals>[number];
}) {
  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-01">{row.goal.description}</p>
        <span
          className={cn(
            "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border",
            STATUS_CLASS[row.status],
          )}
        >
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-02">
        {row.goal.scope ? <span>scope: {row.goal.scope}</span> : null}
        {row.goal.sector ? <span>sector: {row.goal.sector}</span> : null}
        {row.goal.reductionPercent != null ? (
          <span className="tabular-nums">
            {row.goal.reductionPercent}% · {row.goal.baselineYear ?? "?"}→
            {row.goal.targetYear ?? "?"}
          </span>
        ) : null}
      </div>
      {row.actualRemainingShare != null &&
      row.expectedRemainingShare != null ? (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-gray-03/30 relative">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-03/70"
              style={{
                width: `${Math.round(row.expectedRemainingShare * 100)}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-sm bg-gray-01"
              style={{ left: `${Math.round(row.actualRemainingShare * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-02">
            Bar = linear expected remaining. Tick = actual remaining from
            territorial totals
            {row.latestYear ? ` (${row.latestYear})` : ""}.
          </div>
        </div>
      ) : null}
      <p className="text-xs text-gray-02">{row.explanation}</p>
      {row.goal.sourceQuote ? (
        <p className="text-xs text-gray-02/80 italic">
          “{row.goal.sourceQuote}”
        </p>
      ) : null}
    </div>
  );
}
