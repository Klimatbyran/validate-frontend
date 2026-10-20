import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ViewModePills } from "@/ui/view-mode-pills";
import type { GoalsGroupById } from "../lib/explore-types";
import {
  clusterGoalAtlas,
  GOAL_STATUS_LABEL,
  layoutClusterNodes,
  type GoalAtlasItem,
} from "../lib/explore-goal-groups";
import type { GoalTrackStatus } from "../lib/explore-goals";

const GROUP_OPTIONS: { value: GoalsGroupById; label: string }[] = [
  { value: "reduction", label: "Reduction %" },
  { value: "status", label: "Track status" },
  { value: "deadline", label: "Deadline" },
  { value: "paris", label: "Paris plan" },
  { value: "scope", label: "Scope" },
];

const STATUS_DOT: Record<GoalTrackStatus, string> = {
  ahead: "bg-blue-03",
  "on-track": "bg-green-03",
  "off-track": "bg-pink-03",
  "too-early": "bg-gray-02",
  "missing-emissions": "bg-orange-03",
  "not-quantified": "bg-gray-03",
};

export function GoalAtlasView({
  items,
  groupBy,
  onGroupByChange,
  nowYear,
  onFocusMunicipality,
}: {
  items: GoalAtlasItem[];
  groupBy: GoalsGroupById;
  onGroupByChange: (value: GoalsGroupById) => void;
  nowYear: number;
  /** Focus atlas + list on this municipality (sets muni + selected scope). */
  onFocusMunicipality: (name: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clusters = useMemo(
    () => clusterGoalAtlas(items, groupBy, nowYear),
    [items, groupBy, nowYear],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-02 rounded-lg border border-gray-03/30 p-4">
        No goals to cluster in this scope yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <ViewModePills
          options={GROUP_OPTIONS}
          value={groupBy}
          onValueChange={onGroupByChange}
          ariaLabel="Goal atlas grouping"
        />
        <span className="text-sm text-gray-02">
          {items.length} goals in {clusters.length} clusters
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gray-03/30 bg-gradient-to-br from-gray-05/90 via-gray-04/50 to-gray-05/80 p-5 min-h-[22rem]">
        <div className="flex flex-wrap gap-6 justify-center items-start content-start">
          {clusters.map((cluster) => {
            const { size, positions } = layoutClusterNodes(
              cluster.items.length,
            );
            return (
              <section
                key={cluster.key}
                className="relative flex flex-col items-center gap-2"
              >
                <div
                  className="relative rounded-full border border-gray-03/40 bg-gray-04/30 flex items-center justify-center"
                  style={{
                    width: size,
                    height: size,
                    boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.04), 0 0 0 1px rgba(${Math.round(40 + cluster.accent * 120)}, ${Math.round(100 + cluster.accent * 80)}, ${Math.round(140 - cluster.accent * 60)}, 0.25)`,
                  }}
                >
                  <div
                    className="absolute inset-3 rounded-full border border-dashed border-gray-03/30 pointer-events-none"
                    aria-hidden
                  />
                  <div className="absolute inset-0">
                    {cluster.items.map((item, i) => {
                      const pos = positions[i] ?? { x: 0, y: 0 };
                      const isSelected = selected?.id === item.id;
                      const reduction = item.row.goal.reductionPercent;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            "absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full border text-[10px] font-semibold tabular-nums flex items-center justify-center transition-transform hover:scale-110",
                            isSelected
                              ? "border-gray-01 ring-2 ring-gray-01/40 z-10 scale-110"
                              : "border-black/20",
                            STATUS_DOT[item.row.status],
                            "text-white",
                          )}
                          style={{
                            left: `calc(50% + ${pos.x}px)`,
                            top: `calc(50% + ${pos.y}px)`,
                            opacity: 0.85 + (reduction != null ? 0.15 : 0),
                          }}
                          title={`${item.municipalityName}: ${item.row.goal.description}`}
                        >
                          {reduction != null ? `${Math.round(reduction)}` : "?"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-center max-w-[11rem]">
                  <div className="text-xs font-semibold text-gray-01">
                    {cluster.label}
                  </div>
                  <div className="text-[10px] text-gray-02">
                    {cluster.items.length} goal
                    {cluster.items.length === 1 ? "" : "s"}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-02 mt-4 text-center">
          Each node is one goal; number = reduction %. Colour = track status.
          Dense clusters use concentric rings so nodes stay clickable.
        </p>
      </div>

      {selected ? (
        <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <button
                type="button"
                className="text-xs text-blue-03 hover:underline"
                onClick={() => onFocusMunicipality(selected.municipalityName)}
              >
                Focus {selected.municipalityName}
              </button>
              <p className="text-sm text-gray-01">
                {selected.row.goal.description}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-03/40 text-gray-01",
              )}
            >
              {GOAL_STATUS_LABEL[selected.row.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-02">
            {selected.row.goal.reductionPercent != null ? (
              <span className="tabular-nums">
                {selected.row.goal.reductionPercent}% ·{" "}
                {selected.row.goal.baselineYear ?? "?"}→
                {selected.row.goal.targetYear ?? "?"}
              </span>
            ) : null}
            {selected.row.goal.scope ? (
              <span>scope: {selected.row.goal.scope}</span>
            ) : null}
            {selected.parisMentioned ? (
              <span className="text-blue-03">Paris mentioned in plan</span>
            ) : null}
            {selected.onePointFiveMentioned ? (
              <span className="text-blue-03">1.5° mentioned</span>
            ) : null}
            {selected.carbonBudgetReferenced ? (
              <span className="text-blue-03">Carbon budget referenced</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-02">{selected.row.explanation}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-02">Click a goal node for detail.</p>
      )}
    </div>
  );
}
