import { History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTefMatchSnapshots } from "../hooks/useTefMatchSnapshots";
import {
  computeTefMatchDiff,
  type MatchDiffEntry,
} from "../lib/tef-match-diff";
import type { ExtractedMeasure } from "../hooks/useClimatePlanDetail";

const MATCH_BADGE: Record<MatchDiffEntry["status"], string> = {
  new: "border-green-03/40 bg-green-03/10 text-green-03",
  same: "border-gray-03 bg-gray-03/20 text-gray-02",
  old: "border-pink-03/40 bg-pink-03/10 text-pink-03 line-through",
};

const MATCH_LABEL: Record<MatchDiffEntry["status"], string> = {
  new: "New",
  same: "Same",
  old: "Removed",
};

// "Shadow" marks a match that isn't an official TEF taxonomy entry -- the
// shift was instead attached to a shadow-taxonomy element created on the
// fly because no real TE fit. Without this, a "new" shadow attachment reads
// identically to a newly-added official TE match, which is the opposite of
// what a reviewer needs to know: one means "the real taxonomy grew," the
// other means "still needs a human to promote or reject it."
function OriginTag({
  origin,
  shadowStatus,
}: {
  origin: MatchDiffEntry["origin"];
  shadowStatus?: string | null;
}) {
  if (origin !== "shadow") return null;
  return (
    <span className="rounded-sm bg-purple-03/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-purple-03">
      Shadow{shadowStatus ? ` · ${shadowStatus}` : ""}
    </span>
  );
}

function MatchPill({ match }: { match: MatchDiffEntry }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
        MATCH_BADGE[match.status],
      )}
    >
      <span className="font-semibold uppercase tracking-wide text-[10px]">
        {MATCH_LABEL[match.status]}
      </span>
      <OriginTag origin={match.origin} shadowStatus={match.shadowStatus} />
      {match.shortLabel}
    </span>
  );
}

// Live TEF matches vs. the frozen per-plan snapshot -- see
// computeTefMatchDiff for how "new"/"same"/"old" per match, and new/
// removed whole shifts, are decided. `measures` has to come from the
// caller (StepResultDialog's already-loaded plan detail): unlike the
// snapshot, there's no separate endpoint to fetch live matches from here.
export function TefMatchDiffView({
  planId,
  measures,
}: {
  planId: string;
  measures: ExtractedMeasure[];
}) {
  const { snapshots, isLoading, error } = useTefMatchSnapshots(planId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-02 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading snapshot…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-03 py-4">{error}</p>;
  }
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-gray-02 py-4">
        No frozen snapshot exists for this plan yet — take one to compare
        against.
      </p>
    );
  }

  const { shifts, removedShifts } = computeTefMatchDiff(measures, snapshots);
  const newShiftCount = shifts.filter((s) => s.isNewShift).length;
  const allMatches = shifts.flatMap((s) => s.matches);
  const newMatchCount = allMatches.filter((m) => m.status === "new").length;
  const sameMatchCount = allMatches.filter((m) => m.status === "same").length;
  const oldMatchCount = allMatches.filter((m) => m.status === "old").length;
  const removedShiftMatchCount = removedShifts.reduce(
    (n, r) => n + r.matches.length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-02">
        <span>
          {newMatchCount} new match{newMatchCount === 1 ? "" : "es"}
        </span>
        <span>·</span>
        <span>{sameMatchCount} same</span>
        <span>·</span>
        <span>{oldMatchCount} removed</span>
        {(removedShifts.length > 0 || newShiftCount > 0) && <span>·</span>}
        {newShiftCount > 0 && (
          <span>
            {newShiftCount} new shift{newShiftCount === 1 ? "" : "s"}
          </span>
        )}
        {newShiftCount > 0 && removedShifts.length > 0 && <span>·</span>}
        {removedShifts.length > 0 && (
          <span>
            {removedShifts.length} removed shift
            {removedShifts.length === 1 ? "" : "s"} ({removedShiftMatchCount}{" "}
            match{removedShiftMatchCount === 1 ? "" : "es"})
          </span>
        )}
      </div>

      <div className="space-y-3">
        {shifts.map((shift) => (
          <div
            key={shift.shiftId}
            className="rounded-md border border-gray-03/50 bg-gray-05/30 p-3 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {shift.isNewShift && (
                <span className="inline-flex items-center rounded-md border border-green-03/40 bg-green-03/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-03">
                  New shift
                </span>
              )}
              <span className="text-sm text-gray-01">
                {shift.shiftFrom} → {shift.shiftTo}
              </span>
            </div>
            {shift.matches.length === 0 ? (
              <p className="text-xs text-gray-02 italic">No matches</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {shift.matches.map((m) => (
                  <MatchPill key={m.stableId} match={m} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {removedShifts.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-pink-03">
            <History className="w-3.5 h-3.5" />
            Removed since snapshot
          </h4>
          {removedShifts.map((r) => (
            <div
              key={r.activityShiftId}
              className="rounded-md border border-pink-03/30 bg-pink-03/5 p-2.5 opacity-80 space-y-1"
            >
              <p className="text-sm text-gray-01">
                {r.shiftFrom} → {r.shiftTo}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {r.matches.map((m) => (
                  <span
                    key={m.stableId}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-02"
                  >
                    <OriginTag
                      origin={m.origin}
                      shadowStatus={m.shadowStatus}
                    />
                    {m.shortLabel}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
