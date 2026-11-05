import type {
  ActivityShift,
  Commitment,
  ExtractedMeasure,
} from "../hooks/useClimatePlanDetail";

/** Survive extractCommitments delete+recreate by keying on stableId. */
export function commitmentEntityId(commitment: Commitment): string {
  return commitment.stableId;
}

/** Survive extractMeasures recreate when measure text is unchanged. */
export function measureEntityId(measure: ExtractedMeasure): string {
  let hash = 0;
  for (let i = 0; i < measure.measureText.length; i++) {
    hash = (hash * 31 + measure.measureText.charCodeAt(i)) | 0;
  }
  return `measure:${(hash >>> 0).toString(36)}`;
}

/** Survive scoreMeasures recreate when shift content is unchanged. */
export function activityShiftEntityKey(shift: ActivityShift): string {
  return [
    shift.type,
    shift.shiftFrom,
    shift.shiftTo,
    shift.need,
    shift.activity,
  ]
    .join("|")
    .slice(0, 200);
}

export function teMatchEntityId(
  shift: ActivityShift,
  matchStableId: string,
): string {
  return `${activityShiftEntityKey(shift)}:${matchStableId}`;
}
