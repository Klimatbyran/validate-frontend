import type { ExtractedMeasure } from "../hooks/useClimatePlanDetail";
import type { TefMatchSnapshot } from "../hooks/useTefMatchSnapshots";

export interface MatchDiffEntry {
  stableId: string;
  shortLabel: string;
  status: "new" | "same" | "old";
}

export interface ShiftDiff {
  shiftId: string;
  measureText: string;
  shiftFrom: string;
  shiftTo: string;
  /** No snapshot row exists for this shift at all -- every match on it is
   * "new" by definition, not because any of them individually changed. */
  isNewShift: boolean;
  matches: MatchDiffEntry[];
}

export interface RemovedShift {
  activityShiftId: string;
  measureText: string;
  shiftFrom: string;
  shiftTo: string;
  matches: { stableId: string; shortLabel: string }[];
}

export interface TefMatchDiff {
  shifts: ShiftDiff[];
  removedShifts: RemovedShift[];
}

function snapshotMatches(
  row: TefMatchSnapshot,
): { stableId: string; shortLabel: string }[] {
  return Array.isArray(row.transitionElementMatches)
    ? (row.transitionElementMatches as {
        stableId: string;
        shortLabel: string;
      }[])
    : [];
}

/** Classifies each live shift's current TE matches against its frozen
 * snapshot row (matched by activityShiftId -- stable across a TEF-only
 * rerun, since matchTransitionElements updates rows in place rather than
 * recreating them; a full report rerun instead deletes+recreates shift
 * rows with new ids, so those show up as entirely new shifts rather than
 * per-match diffs, which is the correct reading since there's nothing
 * genuinely comparable to line them up against). A match present now but
 * not in the frozen set is "new"; present in both is "same"; present in
 * the frozen set but gone now is "old". A snapshot row whose shift no
 * longer exists live at all is listed separately as a removed shift. */
export function computeTefMatchDiff(
  measures: ExtractedMeasure[],
  snapshots: TefMatchSnapshot[],
): TefMatchDiff {
  const snapshotByShiftId = new Map<string, TefMatchSnapshot>();
  for (const row of snapshots) snapshotByShiftId.set(row.activityShiftId, row);

  const liveShiftIds = new Set<string>();
  const shifts: ShiftDiff[] = [];

  for (const measure of measures) {
    for (const shift of measure.score?.activityShifts ?? []) {
      liveShiftIds.add(shift.id);
      const snapshotRow = snapshotByShiftId.get(shift.id);

      if (!snapshotRow) {
        shifts.push({
          shiftId: shift.id,
          measureText: measure.measureText,
          shiftFrom: shift.shiftFrom,
          shiftTo: shift.shiftTo,
          isNewShift: true,
          matches: shift.transitionElementMatches.map((m) => ({
            stableId: m.stableId,
            shortLabel: m.shortLabel,
            status: "new" as const,
          })),
        });
        continue;
      }

      const frozen = snapshotMatches(snapshotRow);
      const frozenIds = new Set(frozen.map((m) => m.stableId));
      const liveIds = new Set(
        shift.transitionElementMatches.map((m) => m.stableId),
      );

      const matches: MatchDiffEntry[] = shift.transitionElementMatches.map(
        (m) => ({
          stableId: m.stableId,
          shortLabel: m.shortLabel,
          status: frozenIds.has(m.stableId) ? "same" : "new",
        }),
      );
      for (const m of frozen) {
        if (!liveIds.has(m.stableId)) {
          matches.push({
            stableId: m.stableId,
            shortLabel: m.shortLabel,
            status: "old",
          });
        }
      }

      shifts.push({
        shiftId: shift.id,
        measureText: measure.measureText,
        shiftFrom: shift.shiftFrom,
        shiftTo: shift.shiftTo,
        isNewShift: false,
        matches,
      });
    }
  }

  const removedShifts: RemovedShift[] = snapshots
    .filter((row) => !liveShiftIds.has(row.activityShiftId))
    .map((row) => ({
      activityShiftId: row.activityShiftId,
      measureText: row.measureText,
      shiftFrom: row.shiftFrom,
      shiftTo: row.shiftTo,
      matches: snapshotMatches(row),
    }));

  return { shifts, removedShifts };
}
