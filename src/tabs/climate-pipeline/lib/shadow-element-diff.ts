import type { ShadowElement } from "../hooks/useShadowElements";
import type { ShadowElementSnapshot } from "../hooks/useShadowElementSnapshots";

export interface ShadowElementChange {
  field: "status" | "quality" | "comment";
  from: string;
  to: string;
}

export interface ShadowElementDiffEntry {
  element: ShadowElement;
  status: "new" | "same" | "changed";
  changes: ShadowElementChange[];
}

export interface RemovedShadowElement {
  originalId: string;
  shortLabel: string;
  description: string;
  activityShiftCategory: string;
  status: string;
}

export interface ShadowElementDiff {
  entries: ShadowElementDiffEntry[];
  removed: RemovedShadowElement[];
}

/** Classifies every live shadow element against the frozen snapshot it
 * corresponds to (matched by id, since the snapshot's originalId is a
 * plain string copy of the live id at freeze time -- see
 * ShadowTransitionElementSnapshot's own comment on why that's not a real
 * foreign key). An element with no snapshot row didn't exist at freeze
 * time ("new"); one whose status/quality/comment all still match is
 * "same"; anything else is "changed", with the specific fields that
 * moved. A snapshot row with no live counterpart was deleted since the
 * freeze (e.g. via "Remove all") -- listed separately since there's no
 * live row left to render it against. */
export function computeShadowElementDiff(
  elements: ShadowElement[],
  snapshots: ShadowElementSnapshot[],
): ShadowElementDiff {
  const snapshotById = new Map<string, ShadowElementSnapshot>();
  for (const s of snapshots) snapshotById.set(s.originalId, s);
  const liveIds = new Set(elements.map((el) => el.id));

  const entries: ShadowElementDiffEntry[] = elements.map((element) => {
    const snapshot = snapshotById.get(element.id);
    if (!snapshot) return { element, status: "new", changes: [] };

    const changes: ShadowElementChange[] = [];
    if (snapshot.status !== element.status) {
      changes.push({
        field: "status",
        from: snapshot.status,
        to: element.status,
      });
    }
    if (snapshot.qualityGrade !== element.qualityGrade) {
      changes.push({
        field: "quality",
        from: snapshot.qualityGrade,
        to: element.qualityGrade,
      });
    }
    if ((snapshot.comment ?? "") !== (element.comment ?? "")) {
      changes.push({
        field: "comment",
        from: snapshot.comment ?? "",
        to: element.comment ?? "",
      });
    }

    return {
      element,
      status: changes.length > 0 ? "changed" : "same",
      changes,
    };
  });

  const removed: RemovedShadowElement[] = snapshots
    .filter((s) => !liveIds.has(s.originalId))
    .map((s) => ({
      originalId: s.originalId,
      shortLabel: s.shortLabel,
      description: s.description,
      activityShiftCategory: s.activityShiftCategory,
      status: s.status,
    }));

  return { entries, removed };
}
