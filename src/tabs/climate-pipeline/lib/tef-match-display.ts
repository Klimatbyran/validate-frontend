const SHIFT_TYPE_LABELS: Record<string, string> = {
  TypeShift: "Type Shift",
  ResourceShift: "Resource Shift",
  UtilisationShift: "Utilisation Shift",
  WorkEfficiencyShift: "Work Efficiency Shift",
  ResourceEfficiencyShift: "Resource Efficiency Shift",
  CarbonShift: "Carbon Shift",
};

const GROUP_KIND_LABELS: Record<string, string> = {
  specific: "Specific",
  multiple_specific: "Several matches",
  too_narrow: "Too narrow",
  ambiguous: "Ambiguous",
  none: "No match",
};

const AI_REVIEW_HEADLINES: Record<string, string> = {
  CORRECT_NO_MATCH: "Confirmed: no match warranted",
  TAXONOMY_GAP: "Taxonomy gap — new element warranted",
  RETRIEVAL_MISS: "Taxonomy miss — an existing element was missed",
  JUDGE_ERROR: "Judge error — a shown candidate should have matched",
  // TEF white paper: a supporting technology/infrastructure/attribute that
  // makes some OTHER activity's shift more feasible, without itself being
  // a change in an activity (e.g. charging infrastructure, grid batteries)
  // -- not an Activity Shift, so no shadow element gets created for it.
  ENABLING_NOT_SHIFT: "Enabling technology, not an Activity Shift",
};

const AI_REVIEW_PILLS: Record<string, string> = {
  CORRECT_NO_MATCH: "No match",
  TAXONOMY_GAP: "Taxonomy gap",
  RETRIEVAL_MISS: "Taxonomy miss",
  JUDGE_ERROR: "Judge error",
  ENABLING_NOT_SHIFT: "Enabling, not a shift",
};

const BOILERPLATE_GROUP_LABELS = new Set(["no domain named"]);

export function canonicalShiftType(value: string): string {
  return SHIFT_TYPE_LABELS[value] ?? value;
}

export function shiftTypesAgree(ours: string, theirs: string): boolean {
  return canonicalShiftType(ours) === canonicalShiftType(theirs);
}

export function tefCategoryOf(match: {
  activityShiftCategory?: string | null;
  ourShiftType?: string | null;
}): string | null {
  return match.activityShiftCategory ?? match.ourShiftType ?? null;
}

/** Binary shift/improve tag from runs that predate activityShiftCategory. */
export function legacyExportTag(match: {
  activityShiftCategory?: string | null;
  ourShiftType?: string | null;
  legacyExportType?: string | null;
  type?: string | null;
}): string | null {
  if (tefCategoryOf(match)) return null;
  return match.legacyExportType ?? match.type ?? null;
}

export function matchOutcomeLabel(
  groupKind: string | null | undefined,
  gateDomain: string | null | undefined,
  groupLabel: string | null | undefined,
): string | null {
  if (!groupKind) return null;
  const base = outcomeBaseLabel(groupKind, gateDomain);
  const extra = outcomeExtraLabel(groupKind, groupLabel);
  return extra ? `${base}: ${extra}` : base;
}

function outcomeBaseLabel(
  groupKind: string,
  gateDomain: string | null | undefined,
): string {
  if (groupKind === "none" && !gateDomain) return "No domain";
  return GROUP_KIND_LABELS[groupKind] ?? groupKind;
}

function outcomeExtraLabel(
  groupKind: string,
  groupLabel: string | null | undefined,
): string | null {
  if (groupKind !== "none" && groupKind !== "too_narrow") return null;
  if (!groupLabel || BOILERPLATE_GROUP_LABELS.has(groupLabel)) return null;
  return groupLabel;
}

export function aiReviewHeadline(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  return AI_REVIEW_HEADLINES[category] ?? category;
}

export function aiReviewPillLabel(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  return AI_REVIEW_PILLS[category] ?? category;
}

/** Stable id the judge-error review names, when that id is one of the candidates. */
export function reviewerChosenStableId(
  explanation: string | null | undefined,
  candidateIds: string[],
): string | null {
  if (!explanation) return null;
  let earliest: { id: string; index: number } | null = null;
  for (const id of candidateIds) {
    const index = explanation.indexOf(id);
    if (index === -1) continue;
    if (!earliest || index < earliest.index) earliest = { id, index };
  }
  return earliest?.id ?? null;
}

export function matchMechanismLine(match: {
  matchReasoning?: string;
  actsOnLabels?: string[];
  shiftsToLabels?: string[];
}): string | null {
  if (match.matchReasoning) return match.matchReasoning;
  return joinedLabelLine(match);
}

function joinedLabelLine(match: {
  actsOnLabels?: string[];
  shiftsToLabels?: string[];
}): string | null {
  const parts: string[] = [];
  if (match.actsOnLabels?.length) {
    parts.push(`acts_on "${match.actsOnLabels.join(", ")}"`);
  }
  if (match.shiftsToLabels?.length) {
    parts.push(`shifts_to "${match.shiftsToLabels.join(", ")}"`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
