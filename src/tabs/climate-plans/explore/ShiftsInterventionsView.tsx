import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ViewModePills } from "@/ui/view-mode-pills";
import { MethodologyPanel } from "./MethodologyPanel";
import type {
  ExploreMunicipalityRecord,
  ShiftsLayoutId,
} from "../lib/explore-types";
import {
  buildShiftFlows,
  collectMeasurePoints,
  dimensionPresent,
  interventionTypeBuckets,
  summarizeMunicipalities,
  tefHitInterventionCoverage,
} from "../lib/explore-shifts";

const LAYOUTS: { id: ShiftsLayoutId; label: string; hint: string }[] = [
  {
    id: "compare",
    label: "Shift vs intervention",
    hint: "TEF matching rides on activity shifts; interventions are who/what/when/how",
  },
  {
    id: "flows",
    label: "Activity flows",
    hint: "Most common shift_from → shift_to pairs across extracts",
  },
  {
    id: "types",
    label: "Intervention types",
    hint: "direct / indirect / enabling / none mix and score",
  },
];

export function ShiftsInterventionsView({
  records,
  layout,
  onLayoutChange,
  selectedName,
  onSelectName,
}: {
  records: ExploreMunicipalityRecord[];
  layout: ShiftsLayoutId;
  onLayoutChange: (layout: ShiftsLayoutId) => void;
  selectedName: string | null;
  onSelectName: (name: string) => void;
}) {
  const summaries = useMemo(() => summarizeMunicipalities(records), [records]);
  const points = useMemo(() => collectMeasurePoints(records), [records]);
  const flows = useMemo(() => buildShiftFlows(records), [records]);
  const types = useMemo(() => interventionTypeBuckets(records), [records]);
  const allHits = useMemo(
    () => records.flatMap((r) => r.tefHits),
    [records],
  );
  const tefCoverage = useMemo(
    () => tefHitInterventionCoverage(allHits),
    [allHits],
  );

  const layoutMeta = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const shiftPresent = points.filter((p) =>
    dimensionPresent(p.activityShiftScore),
  ).length;
  const interventionPresent = points.filter((p) =>
    dimensionPresent(p.interventionScore),
  ).length;

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="Per measure: activity_shift_score + activity_shifts[] (from/to/need + TEF matches) versus intervention_who/when/what/how + intervention_score + intervention_type. TEF framework hits are produced from activity shifts — interventions are a separate specificity axis."
        calculation="Present = score > 1. Municipality averages are mean scores across measures. Flow edges count identical shift_from→shift_to pairs. Type buckets group intervention_type (none/direct/indirect/enabling)."
        extra={layoutMeta.hint}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <ViewModePills
          options={LAYOUTS.map((l) => ({ value: l.id, label: l.label }))}
          value={layout}
          onValueChange={onLayoutChange}
          ariaLabel="Shifts and interventions layouts"
        />
        <span className="text-sm text-gray-02">
          {points.length} measures · {shiftPresent} with shifts ·{" "}
          {interventionPresent} with interventions · {allHits.length} TEF hits
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Avg activity-shift score"
          value={formatAvg(
            points.map((p) => p.activityShiftScore),
          )}
          hint="Clarity of from→to in the measure text"
        />
        <StatCard
          label="Avg intervention score"
          value={formatAvg(points.map((p) => p.interventionScore))}
          hint="Specificity of who / when / what / how"
        />
        <StatCard
          label="TEF hits naming who / what"
          value={`${tefCoverage.withInterventionWho}/${tefCoverage.withInterventionWhat}`}
          hint={`who / what filled on ${allHits.length} TEF-linked measure hits`}
        />
      </div>

      {layout === "compare" ? (
        <CompareLayout
          summaries={summaries}
          points={points}
          selectedName={selectedName}
          onSelectName={onSelectName}
        />
      ) : null}
      {layout === "flows" ? <FlowsLayout flows={flows} /> : null}
      {layout === "types" ? <TypesLayout types={types} points={points} /> : null}
    </div>
  );
}

function formatAvg(values: number[]): string {
  if (values.length === 0) return "—";
  const avg = values.reduce((s, n) => s + n, 0) / values.length;
  return `${avg.toFixed(1)} / 7`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 px-4 py-3 space-y-1">
      <div className="text-xs uppercase tracking-wide text-gray-02 font-semibold">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-01 tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-gray-02">{hint}</div>
    </div>
  );
}

function CompareLayout({
  summaries,
  points,
  selectedName,
  onSelectName,
}: {
  summaries: ReturnType<typeof summarizeMunicipalities>;
  points: ReturnType<typeof collectMeasurePoints>;
  selectedName: string | null;
  onSelectName: (name: string) => void;
}) {
  const selectedPoints = selectedName
    ? points.filter((p) => p.municipalityName === selectedName)
    : points.slice(0, 40);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-03/30">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-03/40 text-gray-02">
              <th className="text-left px-3 py-2 font-medium">Municipality</th>
              <th className="text-right px-3 py-2 font-medium">Measures</th>
              <th className="text-right px-3 py-2 font-medium">Shifts &gt;1</th>
              <th className="text-right px-3 py-2 font-medium">Interv. &gt;1</th>
              <th className="text-left px-3 py-2 font-medium min-w-[12rem]">
                Avg shift vs intervention
              </th>
              <th className="text-right px-3 py-2 font-medium">TEF hits</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => {
              const selected = row.municipalityName === selectedName;
              return (
                <tr
                  key={row.municipalityId}
                  className={cn(
                    "border-b border-gray-03/20 cursor-pointer",
                    selected ? "bg-gray-03/20" : "hover:bg-gray-04/60",
                  )}
                  onClick={() => onSelectName(row.municipalityName)}
                >
                  <td className="px-3 py-2 text-gray-01 whitespace-nowrap">
                    {row.municipalityName}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                    {row.measureCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                    {row.shiftPresentCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                    {row.interventionPresentCount}
                  </td>
                  <td className="px-3 py-2">
                    <DualScoreBar
                      shift={row.avgActivityShiftScore}
                      intervention={row.avgInterventionScore}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-01">
                    {row.tefHitCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-03/30 bg-gray-05/30 p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-01">
            Measure scatter (shift score × intervention score)
          </h3>
          <span className="text-xs text-gray-02">
            {selectedName
              ? selectedName
              : `Showing first ${Math.min(40, points.length)} of ${points.length}`}
          </span>
        </div>
        <ScoreScatter points={selectedPoints} />
      </div>
    </div>
  );
}

function DualScoreBar({
  shift,
  intervention,
}: {
  shift: number;
  intervention: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] w-8 text-gray-02">shift</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-03/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-03/80"
            style={{ width: `${(shift / 7) * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-gray-02 w-6 text-right">
          {shift.toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] w-8 text-gray-02">int.</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-03/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-03/80"
            style={{ width: `${(intervention / 7) * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-gray-02 w-6 text-right">
          {intervention.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function ScoreScatter({
  points,
}: {
  points: ReturnType<typeof collectMeasurePoints>;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-02">No measures in this selection.</p>;
  }
  return (
    <div className="relative h-56 rounded-md border border-gray-03/30 bg-gray-04/40">
      <div className="absolute left-8 right-3 top-3 bottom-8 border-l border-b border-gray-03/40">
        {points.map((point, i) => {
          const x = ((point.activityShiftScore - 1) / 6) * 100;
          const y = ((point.interventionScore - 1) / 6) * 100;
          return (
            <div
              key={`${point.municipalityId}-${i}`}
              className={cn(
                "absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 translate-y-1/2 border border-black/20",
                point.tefMatchCount > 0 ? "bg-blue-03" : "bg-gray-02/70",
                point.interventionType !== "none" && "ring-1 ring-orange-03/60",
              )}
              style={{ left: `${x}%`, bottom: `${y}%` }}
              title={`${point.municipalityName}: shift ${point.activityShiftScore}, intervention ${point.interventionScore}\n${point.measureText.slice(0, 120)}`}
            />
          );
        })}
      </div>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[10px] text-gray-02">
        Activity shift score →
      </span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[10px] text-gray-02 whitespace-nowrap">
        Intervention score →
      </span>
      <div className="absolute right-3 top-3 text-[10px] text-gray-02 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-03" /> TEF match
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-02/70 ring-1 ring-orange-03/60" />{" "}
          typed intervention
        </div>
      </div>
    </div>
  );
}

function FlowsLayout({
  flows,
}: {
  flows: ReturnType<typeof buildShiftFlows>;
}) {
  if (flows.length === 0) {
    return (
      <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 p-4">
        No activity shifts with from/to pairs in the loaded extracts yet.
      </p>
    );
  }
  const maxCount = Math.max(...flows.map((f) => f.count), 1);
  return (
    <div className="space-y-2">
      {flows.map((flow) => (
        <div
          key={`${flow.from}→${flow.to}`}
          className="rounded-lg border border-gray-03/30 bg-gray-04/40 px-4 py-3 space-y-2"
        >
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-gray-01 font-medium">{flow.from}</span>
            <span className="text-gray-02">→</span>
            <span className="text-gray-01 font-medium">{flow.to}</span>
            <span className="ml-auto text-xs tabular-nums text-gray-02">
              ×{flow.count} · avg score {flow.avgShiftScore.toFixed(1)} · TEF on{" "}
              {flow.withTefMatch}/{flow.count}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-03/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-03/70"
              style={{ width: `${(flow.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-02">
            {flow.municipalities.join(", ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypesLayout({
  types,
  points,
}: {
  types: ReturnType<typeof interventionTypeBuckets>;
  points: ReturnType<typeof collectMeasurePoints>;
}) {
  const maxCount = Math.max(...types.map((t) => t.count), 1);
  const componentCoverage = {
    who: points.filter((p) => p.hasWho).length,
    when: points.filter((p) => p.hasWhen).length,
    what: points.filter((p) => p.hasWhat).length,
    how: points.filter((p) => p.hasHow).length,
  };
  const total = Math.max(points.length, 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-01">
          Intervention type mix
        </h3>
        {types.map((bucket) => (
          <div key={bucket.type} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize text-gray-01">{bucket.type}</span>
              <span className="tabular-nums text-gray-02 text-xs">
                {bucket.count} · avg {bucket.avgScore.toFixed(1)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-03/30 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  bucket.type === "direct"
                    ? "bg-green-03/80"
                    : bucket.type === "indirect"
                      ? "bg-blue-03/80"
                      : bucket.type === "enabling"
                        ? "bg-orange-03/80"
                        : "bg-gray-03",
                )}
                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gray-03/30 bg-gray-04/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-01">
          Who / when / what / how filled
        </h3>
        {(
          [
            ["Who", componentCoverage.who],
            ["When", componentCoverage.when],
            ["What", componentCoverage.what],
            ["How", componentCoverage.how],
          ] as const
        ).map(([label, count]) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-01">{label}</span>
              <span className="tabular-nums text-gray-02 text-xs">
                {count}/{points.length} ({Math.round((count / total) * 100)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-03/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-03/70"
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-02 pt-1">
          TEF catalogue matching attaches to activity shifts. Intervention
          fields answer whether the measure also names an actor and mechanism —
          often sparse even when a shift is clear.
        </p>
      </div>
    </div>
  );
}
