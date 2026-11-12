import type {
  ActivityShift,
  ExtractedMeasure,
} from "../hooks/useClimatePlanDetail";
import type { TefMatchSnapshot } from "../hooks/useTefMatchSnapshots";

/** Which list a match came from, not a judgment about it -- "real" means
 * it's a stableId from the official TEF taxonomy (shift.transitionElementMatches);
 * "shadow" means the shift was instead attached to a shadow-taxonomy element
 * (shift.shadowElementId) because no real TE fit. A shift can have real
 * matches, a shadow attachment, or (rarely, mid-review) both. */
export type MatchOrigin = "real" | "shadow";

export interface MatchDiffEntry {
  stableId: string;
  shortLabel: string;
  status: "new" | "same" | "old";
  origin: MatchOrigin;
  /** Only set for a shadow-origin entry -- the shadow element's own review
   * status (preliminary/promoted/rejected/merged), so "new" doesn't read as
   * "an official TE was just added" when it's actually an unreviewed
   * on-the-fly element. */
  shadowStatus?: string | null;
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
  matches: {
    stableId: string;
    shortLabel: string;
    origin: MatchOrigin;
    shadowStatus?: string | null;
  }[];
}

export interface TefMatchDiff {
  shifts: ShiftDiff[];
  removedShifts: RemovedShift[];
}

interface MatchSource {
  stableId: string;
  shortLabel: string;
  origin: MatchOrigin;
  shadowStatus?: string | null;
}

// A shift's full set of "what it resolved to" -- the real TE matches it has
// AND, separately, whichever single shadow element it's attached to (set
// only when the real pass found nothing good enough). These never share an
// id (real stableIds are taxonomy strings, shadow ids are database cuids),
// so folding them into one list keeps the new/same/old diffing below
// correct without having to special-case either kind.
function liveShiftEntries(shift: ActivityShift): MatchSource[] {
  const entries: MatchSource[] = shift.transitionElementMatches.map((m) => ({
    stableId: m.stableId,
    shortLabel: m.shortLabel,
    origin: "real",
  }));
  if (shift.shadowElementId) {
    entries.push({
      stableId: shift.shadowElementId,
      shortLabel: shift.shadowElement?.shortLabel ?? "(shadow element)",
      origin: "shadow",
      shadowStatus: shift.shadowElement?.status ?? null,
    });
  }
  return entries;
}

function snapshotEntries(row: TefMatchSnapshot): MatchSource[] {
  const entries: MatchSource[] = Array.isArray(row.transitionElementMatches)
    ? (
        row.transitionElementMatches as {
          stableId: string;
          shortLabel: string;
        }[]
      ).map((m) => ({
        stableId: m.stableId,
        shortLabel: m.shortLabel,
        origin: "real",
      }))
    : [];
  if (row.shadowElementId) {
    entries.push({
      stableId: row.shadowElementId,
      shortLabel: row.shadowElementShortLabel ?? "(shadow element)",
      origin: "shadow",
      shadowStatus: row.shadowElementStatus,
    });
  }
  return entries;
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
 * longer exists live at all is listed separately as a removed shift.
 *
 * Each entry also carries where it came from (official TEF taxonomy vs. a
 * shadow-taxonomy element attached on the fly) -- see liveShiftEntries /
 * snapshotEntries. */
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
      const live = liveShiftEntries(shift);

      if (!snapshotRow) {
        shifts.push({
          shiftId: shift.id,
          measureText: measure.measureText,
          shiftFrom: shift.shiftFrom,
          shiftTo: shift.shiftTo,
          isNewShift: true,
          matches: live.map((m) => ({ ...m, status: "new" as const })),
        });
        continue;
      }

      const frozen = snapshotEntries(snapshotRow);
      const frozenIds = new Set(frozen.map((m) => m.stableId));
      const liveIds = new Set(live.map((m) => m.stableId));

      const matches: MatchDiffEntry[] = live.map((m) => ({
        ...m,
        status: frozenIds.has(m.stableId) ? "same" : "new",
      }));
      for (const m of frozen) {
        if (!liveIds.has(m.stableId)) {
          matches.push({ ...m, status: "old" });
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
      matches: snapshotEntries(row),
    }));

  return { shifts, removedShifts };
}
