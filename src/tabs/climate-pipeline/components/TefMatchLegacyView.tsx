import { useTefMatchSnapshots } from "../hooks/useTefMatchSnapshots";
import { matchOutcomeLabel } from "../lib/tef-match-display";
import { Loader2 } from "lucide-react";

// Read-only view of a plan's frozen TEF match snapshot(s) -- taken
// deliberately before a TEF-matching rerun, see climate-plans-pipeline's
// ActivityShiftMatchSnapshot / POST /snapshots/tef-freeze. Never the same
// data as the live TransitionElementsView above it; this is what matching
// looked like at the moment of the freeze, kept for comparison.
export function TefMatchLegacyView({ planId }: { planId: string }) {
  const { snapshotsByRun, isLoading, error } = useTefMatchSnapshots(planId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-02 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading legacy snapshot…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-03 py-4">{error}</p>;
  }

  if (snapshotsByRun.size === 0) {
    return (
      <p className="text-sm text-gray-02 py-4">
        No frozen snapshot exists for this plan yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {[...snapshotsByRun.entries()].map(([runId, rows]) => {
        const label = rows[0]?.snapshotLabel;
        const takenAt = rows[0]?.snapshotTakenAt;
        return (
          <div key={runId} className="space-y-3">
            <div className="text-xs text-gray-02 border-b border-gray-04 pb-2">
              {label ? <span className="font-medium">{label}</span> : null}
              {takenAt ? (
                <span className={label ? " ml-2" : ""}>
                  Frozen {new Date(takenAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            {rows.map((row) => {
              const matches = Array.isArray(row.transitionElementMatches)
                ? (row.transitionElementMatches as {
                    stableId: string;
                    shortLabel: string;
                  }[])
                : [];
              const outcome = matchOutcomeLabel(
                row.transitionElementGroupKind,
                row.transitionElementGateDomain,
                row.transitionElementGroupLabel,
              );
              return (
                <div
                  key={row.id}
                  className="rounded-md border border-gray-04 bg-gray-05/40 p-3 space-y-2"
                >
                  <p className="text-sm text-gray-01">{row.measureText}</p>
                  <p className="text-xs text-gray-02">
                    {row.shiftFrom} → {row.shiftTo}
                  </p>
                  {outcome ? (
                    <p className="text-xs text-gray-02">Outcome: {outcome}</p>
                  ) : null}
                  {matches.length > 0 ? (
                    <ul className="text-xs text-gray-01 space-y-0.5">
                      {matches.map((m) => (
                        <li key={m.stableId}>{m.shortLabel}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-02">No match</p>
                  )}
                  {row.shadowElementShortLabel ? (
                    <p className="text-xs text-purple-03">
                      Shadow: {row.shadowElementShortLabel} (
                      {row.shadowElementStatus})
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
