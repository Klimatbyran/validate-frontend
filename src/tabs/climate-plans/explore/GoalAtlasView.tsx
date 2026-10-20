import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ViewModePills } from "@/ui/view-mode-pills";
import type { GoalsGroupById } from "../lib/explore-types";
import {
  clusterGoalAtlas,
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
  onSelectMunicipality,
}: {
  items: GoalAtlasItem[];
  groupBy: GoalsGroupById;
  onGroupByChange: (value: GoalsGroupById) => void;
  nowYear: number;
  onSelectMunicipality: (name: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clusters = useMemo(
    () => clusterGoalAtlas(items, groupBy, nowYear),
    [items, groupBy, nowYear],
  );
  const selected =
    items.find((item) => item.id === selectedId) ??
    clusters[0]?.items[0] ??
    null;

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

      <div
        className="relative overflow-hidden rounded-xl border border-gray-03/30 bg-gradient-to-br from-gray-05/90 via-gray-04/50 to-gray-05/80 p-5 min-h-[22rem]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(34,197,94,0.07), transparent 35%)",
        }}
      >
        <div className="flex flex-wrap gap-6 justify-center items-start content-start">
          {clusters.map((cluster, clusterIndex) => {
            const size = Math.min(
              280,
              120 + Math.sqrt(cluster.items.length) * 36,
            );
            return (
              <section
                key={cluster.key}
                className="relative flex flex-col items-center gap-2"
                style={{
                  animation: `goal-cluster-in 420ms ease-out ${clusterIndex * 40}ms both`,
                }}
              >
                <div
                  className="relative rounded-full border border-gray-03/40 bg-gray-04/30 backdrop-blur-[1px] flex items-center justify-center"
                  style={{
                    width: size,
                    height: size,
                    boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.04), 0 0 0 1px rgba(${Math.round(40 + cluster.accent * 120)}, ${Math.round(100 + cluster.accent * 80)}, ${Math.round(140 - cluster.accent * 60)}, 0.25)`,
                  }}
                >
                  {/* orbit ring */}
                  <div
                    className="absolute inset-3 rounded-full border border-dashed border-gray-03/30 pointer-events-none"
                    aria-hidden
                  />
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1.5 p-8 content-center">
                    {cluster.items.map((item, i) => {
                      const angle =
                        (i / Math.max(cluster.items.length, 1)) * Math.PI * 2 -
                        Math.PI / 2;
                      const radius =
                        cluster.items.length <= 1
                          ? 0
                          : Math.min(size / 2 - 28, 18 + cluster.items.length * 2);
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * radius;
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
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
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
          Clusters rearrange by the axis above — not a standard chart on
          purpose.
        </p>
      </div>

      {selected ? (
        <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 min-w-0">
              <button
                type="button"
                className="text-xs text-blue-03 hover:underline"
                onClick={() => onSelectMunicipality(selected.municipalityName)}
              >
                {selected.municipalityName}
              </button>
              <p className="text-sm text-gray-01">
                {selected.row.goal.description}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border capitalize",
                "border-gray-03/40 text-gray-01",
              )}
            >
              {selected.row.status.replace(/-/g, " ")}
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
      ) : null}

      <style>{`
        @keyframes goal-cluster-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
