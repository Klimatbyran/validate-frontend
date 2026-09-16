import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ViewModePills } from "@/ui/view-mode-pills";
import type {
  CoverageListGroup,
  CoverageListSummary,
} from "@/tabs/overview/lib/coverage-types";
import { coveragePercentTextClass } from "@/tabs/overview/lib/coverage-overview-styles";
import {
  coverageListFocusFromStorage,
  groupCoverageLists,
  persistCoverageListFocus,
  type CoverageListFocus,
} from "@/tabs/overview/lib/coverage-list-groups";

type CoverageListTableProps = {
  lists: CoverageListSummary[];
  groups: CoverageListGroup[];
  onSelectList: (listId: string) => void;
  onCreateList: (groupId?: string | null) => void;
  onEditList: (list: CoverageListSummary) => void;
  onManageGroups: () => void;
};

type FocusPillValue = "all" | "ungrouped" | `group:${string}`;

function focusToPillValue(focus: CoverageListFocus): FocusPillValue {
  if (focus.kind === "group") return `group:${focus.groupId}`;
  return focus.kind;
}

function pillValueToFocus(value: FocusPillValue): CoverageListFocus {
  if (value === "all" || value === "ungrouped") return { kind: value };
  return { kind: "group", groupId: value.slice("group:".length) };
}

function CoverageListsTableBody({
  lists,
  onSelectList,
  onEditList,
  emptyLabel,
}: {
  lists: CoverageListSummary[];
  onSelectList: (listId: string) => void;
  onEditList: (list: CoverageListSummary) => void;
  emptyLabel: string;
}) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-03">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-05/80 text-left text-gray-02">
          <tr>
            <th className="px-4 py-2 font-medium">
              {t("overview.coverage.columns.list")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("overview.coverage.columns.years")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("overview.coverage.columns.latestCoverage")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("overview.coverage.columns.updated")}
            </th>
            <th className="px-4 py-2 font-medium w-[1%]">
              {t("overview.coverage.columns.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => {
            const latestYear = list.years[0];
            return (
              <tr
                key={list.id}
                className="border-t border-gray-03/60 cursor-pointer hover:bg-gray-05/50"
                onClick={() => onSelectList(list.id)}
              >
                <td className="px-4 py-2 font-medium text-gray-01">
                  {list.name}
                </td>
                <td className="px-4 py-2 text-gray-02">{list.years.length}</td>
                <td className="px-4 py-2">
                  {latestYear ? (
                    <span className="text-gray-02 tabular-nums">
                      <span className="font-medium text-gray-01">
                        {latestYear.year}
                      </span>
                      {": "}
                      <span
                        className={`font-semibold ${coveragePercentTextClass(latestYear.coveragePercent)}`}
                      >
                        {latestYear.coveragePercent}%
                      </span>
                      {" ("}
                      {latestYear.matchedCount}/{latestYear.totalNames}
                      {")"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-gray-02">
                  {new Date(list.updatedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={t("overview.coverage.editList")}
                    title={t("overview.coverage.editList")}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditList(list);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
          {lists.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-02">
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function CoverageListTable({
  lists,
  groups,
  onSelectList,
  onCreateList,
  onEditList,
  onManageGroups,
}: CoverageListTableProps) {
  const { t } = useI18n();
  const [focus, setFocus] = useState<CoverageListFocus>(() =>
    coverageListFocusFromStorage(),
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    persistCoverageListFocus(focus);
  }, [focus]);

  useEffect(() => {
    if (focus.kind !== "group") return;
    if (groups.some((group) => group.id === focus.groupId)) return;
    setFocus({ kind: "all" });
  }, [focus, groups]);

  const sections = useMemo(
    () => groupCoverageLists(lists, groups, { focus, search }),
    [lists, groups, focus, search],
  );

  const focusOptions = useMemo(() => {
    const options: { value: FocusPillValue; label: string }[] = [
      { value: "all", label: t("overview.coverage.groupFocus.all") },
      ...groups.map((group) => ({
        value: `group:${group.id}` as FocusPillValue,
        label: group.label,
      })),
      {
        value: "ungrouped",
        label: t("overview.coverage.groupFocus.ungrouped"),
      },
    ];
    return options;
  }, [groups, t]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onManageGroups}>
            {t("overview.coverage.manageGroups")}
          </Button>
          <Button onClick={() => onCreateList(null)}>
            {t("overview.coverage.addList")}
          </Button>
        </div>
      </div>

      <ViewModePills
        options={focusOptions}
        value={focusToPillValue(focus)}
        onValueChange={(value) => setFocus(pillValueToFocus(value))}
        ariaLabel={t("overview.coverage.groupFocusLabel")}
      />

      <input
        className="w-full max-w-md rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("overview.coverage.searchListsPlaceholder")}
      />

      {sections.length === 0 ? (
        <p className="text-sm text-gray-02 py-8 text-center">
          {search
            ? t("overview.coverage.noListsMatchSearch")
            : t("overview.coverage.noLists")}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-01">
                {section.key === "ungrouped"
                  ? t("overview.coverage.ungrouped")
                  : section.label}{" "}
                <span className="font-normal text-gray-02 tabular-nums">
                  ({section.lists.length})
                </span>
              </h3>
              {section.group ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCreateList(section.group?.id)}
                >
                  {t("overview.coverage.addListInGroup")}
                </Button>
              ) : null}
            </div>
            <CoverageListsTableBody
              lists={section.lists}
              onSelectList={onSelectList}
              onEditList={onEditList}
              emptyLabel={
                section.group
                  ? t("overview.coverage.emptyGroup")
                  : t("overview.coverage.noUngroupedLists")
              }
            />
          </section>
        ))
      )}
    </div>
  );
}
