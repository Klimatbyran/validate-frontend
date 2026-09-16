import type { CoverageListGroup, CoverageListSummary } from "./coverage-types";

export type CoverageListFocus =
  | { kind: "all" }
  | { kind: "ungrouped" }
  | { kind: "group"; groupId: string };

export type CoverageListSection = {
  key: string;
  group: CoverageListGroup | null;
  label: string;
  lists: CoverageListSummary[];
};

const FOCUS_STORAGE_KEY = "validate.coverage.listFocus";

export function coverageListFocusFromStorage(): CoverageListFocus {
  if (typeof sessionStorage === "undefined") return { kind: "all" };
  try {
    const raw = sessionStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return { kind: "all" };
    const parsed = JSON.parse(raw) as CoverageListFocus;
    if (parsed?.kind === "all" || parsed?.kind === "ungrouped") return parsed;
    if (parsed?.kind === "group" && typeof parsed.groupId === "string") {
      return parsed;
    }
  } catch {
    // ignore invalid storage
  }
  return { kind: "all" };
}

export function persistCoverageListFocus(focus: CoverageListFocus): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focus));
}

export function slugFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
}

export function groupCoverageLists(
  lists: CoverageListSummary[],
  groups: CoverageListGroup[],
  options: {
    focus?: CoverageListFocus;
    search?: string;
  } = {},
): CoverageListSection[] {
  const focus = options.focus ?? { kind: "all" };
  const search = options.search?.trim().toLowerCase() ?? "";

  const matchingLists = search
    ? lists.filter((list) => list.name.toLowerCase().includes(search))
    : lists;

  const listsByGroupId = new Map<string, CoverageListSummary[]>();
  const ungrouped: CoverageListSummary[] = [];

  for (const list of matchingLists) {
    if (list.group) {
      const existing = listsByGroupId.get(list.group.id) ?? [];
      existing.push(list);
      listsByGroupId.set(list.group.id, existing);
    } else {
      ungrouped.push(list);
    }
  }

  const sections: CoverageListSection[] = groups.map((group) => ({
    key: group.id,
    group,
    label: group.label,
    lists: listsByGroupId.get(group.id) ?? [],
  }));

  const includeUngrouped =
    focus.kind === "ungrouped" || focus.kind === "all" || ungrouped.length > 0;

  if (
    includeUngrouped &&
    (ungrouped.length > 0 || focus.kind === "ungrouped")
  ) {
    sections.push({
      key: "ungrouped",
      group: null,
      label: "Ungrouped",
      lists: ungrouped,
    });
  }

  if (focus.kind === "group") {
    return sections.filter((section) => section.group?.id === focus.groupId);
  }
  if (focus.kind === "ungrouped") {
    return sections.filter((section) => section.key === "ungrouped");
  }

  // While searching, hide empty group sections so results stay scannable.
  if (search) {
    return sections.filter((section) => section.lists.length > 0);
  }

  return sections;
}
