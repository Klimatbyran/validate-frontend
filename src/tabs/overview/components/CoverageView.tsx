import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { useCoverageLists } from "@/tabs/overview/hooks/useCoverageLists";
import { useCoverageYearDetail } from "@/tabs/overview/hooks/useCoverageYearDetail";
import { fetchCoverageYearNames } from "@/tabs/overview/lib/coverage-api";
import { coveragePercentTextClass } from "@/tabs/overview/lib/coverage-overview-styles";
import { CoverageListTable } from "./CoverageListTable";
import { CoverageYearDetailView } from "./CoverageYearDetail";
import { CoverageYearFormDialog } from "./CoverageYearFormDialog";
import { CoverageManageGroupsDialog } from "./CoverageManageGroupsDialog";
import { CoverageEntryMatchDialog } from "./CoverageEntryMatchDialog";
import type {
  CoverageEntry,
  CoverageMatchSaveAction,
} from "@/tabs/overview/lib/coverage-types";

type DialogState =
  | { kind: "closed" }
  | { kind: "createList"; groupId?: string | null }
  | { kind: "addYear"; listId: string }
  | {
      kind: "editList";
      listId: string;
      listName: string;
      groupId: string | null;
    }
  | { kind: "editYear"; listId: string; year: number; namesText: string }
  | { kind: "manageGroups" };

type DeleteConfirmState =
  | { kind: "closed" }
  | { kind: "year"; listId: string; listName: string; year: number }
  | { kind: "list"; listId: string; listName: string };

export function CoverageView() {
  const { t } = useI18n();
  const coverage = useCoverageLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    kind: "closed",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [matchEntry, setMatchEntry] = useState<CoverageEntry | null>(null);
  const [isMatchSubmitting, setIsMatchSubmitting] = useState(false);
  const [renamingEntryId, setRenamingEntryId] = useState<string | null>(null);

  const selectedList = useMemo(
    () => coverage.lists.find((list) => list.id === selectedListId) ?? null,
    [coverage.lists, selectedListId],
  );

  const yearDetail = useCoverageYearDetail(
    selectedListId,
    selectedYear,
    (stats) => {
      if (selectedListId === null || selectedYear === null) return;
      coverage.patchYearStats(selectedListId, selectedYear, stats);
    },
  );

  const openList = (listId: string) => {
    setSelectedListId(listId);
    const list = coverage.lists.find((item) => item.id === listId);
    setSelectedYear(list?.years[0]?.year ?? null);
  };

  const handleCreateList = async (input: {
    listName?: string;
    groupId?: string | null;
    year: number;
    names: string[];
  }) => {
    if (!input.listName) return;
    setIsSubmitting(true);
    try {
      const created = await coverage.createList({
        name: input.listName,
        year: input.year,
        names: input.names,
        groupId: input.groupId ?? null,
      });
      setSelectedListId(created.id);
      setSelectedYear(input.year);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.kind === "closed") return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.kind === "year") {
        await coverage.deleteYear(deleteConfirm.listId, deleteConfirm.year);
        const remaining =
          selectedList?.years.filter((y) => y.year !== deleteConfirm.year) ??
          [];
        setSelectedYear(remaining[0]?.year ?? null);
      } else {
        await coverage.deleteList(deleteConfirm.listId);
        setSelectedListId(null);
        setSelectedYear(null);
      }
      setDeleteConfirm({ kind: "closed" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddOrEditYear = async (input: {
    listName?: string;
    groupId?: string | null;
    year: number;
    names: string[];
  }) => {
    if (dialog.kind === "editList") {
      if (!input.listName) return;
      setIsSubmitting(true);
      try {
        await coverage.updateList(dialog.listId, {
          name: input.listName,
          groupId: input.groupId ?? null,
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (dialog.kind === "addYear") {
      setIsSubmitting(true);
      try {
        await coverage.addYear(dialog.listId, {
          year: input.year,
          names: input.names,
        });
        setSelectedListId(dialog.listId);
        setSelectedYear(input.year);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (dialog.kind === "editYear") {
      setIsSubmitting(true);
      try {
        const previousYear = dialog.year;
        await coverage.updateYearEdition(dialog.listId, previousYear, {
          year: input.year !== previousYear ? input.year : undefined,
          names: input.names,
        });
        setSelectedListId(dialog.listId);
        setSelectedYear(input.year);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const openEditYearDialog = (listId: string, year: number) => {
    void (async () => {
      try {
        const names = await fetchCoverageYearNames(listId, year);
        setDialog({
          kind: "editYear",
          listId,
          year,
          namesText: names.names.join("\n"),
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("overview.coverage.errorTitle"),
        );
      }
    })();
  };

  const editNamesText =
    dialog.kind === "editYear"
      ? dialog.namesText
      : (yearDetail.detail?.entries.map((e) => e.name).join("\n") ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-sm text-gray-02 max-w-3xl">
          {t("overview.subtitleCoverage")}
        </p>
        <Button
          variant="secondary"
          onClick={() => coverage.refresh()}
          disabled={coverage.isRefreshing}
        >
          {coverage.isRefreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {t("common.refresh")}
        </Button>
      </div>

      {coverage.error ? (
        <Callout variant="error" title={t("overview.coverage.errorTitle")}>
          <p className="text-sm">{coverage.error}</p>
        </Callout>
      ) : null}

      {coverage.isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : selectedList ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-03 bg-gray-05/40 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-01">
                {selectedList.name}
              </h3>
              <span className="rounded-full border border-gray-03 px-2.5 py-0.5 text-xs text-gray-02">
                {selectedList.group?.label ?? t("overview.coverage.ungrouped")}
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-02">
                <span>{t("overview.coverage.groupLabel")}</span>
                <select
                  className="rounded-md border border-gray-03 bg-white px-2 py-1 text-sm text-gray-01"
                  value={selectedList.group?.id ?? ""}
                  onChange={(event) => {
                    const nextGroupId = event.target.value || null;
                    void coverage
                      .updateList(selectedList.id, { groupId: nextGroupId })
                      .catch((error) => {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : t("overview.coverage.errorTitle"),
                        );
                      });
                  }}
                >
                  <option value="">{t("overview.coverage.groupNone")}</option>
                  {coverage.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedListId(null)}
              >
                {t("overview.coverage.backToLists")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDialog({
                    kind: "editList",
                    listId: selectedList.id,
                    listName: selectedList.name,
                    groupId: selectedList.group?.id ?? null,
                  })
                }
              >
                {t("overview.coverage.editList")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDialog({ kind: "addYear", listId: selectedList.id })
                }
              >
                {t("overview.coverage.addYear")}
              </Button>
              {selectedYear !== null ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    openEditYearDialog(selectedList.id, selectedYear)
                  }
                >
                  {t("overview.coverage.editYear")}
                </Button>
              ) : null}
              {selectedYear !== null ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setDeleteConfirm({
                      kind: "year",
                      listId: selectedList.id,
                      listName: selectedList.name,
                      year: selectedYear,
                    })
                  }
                >
                  {t("overview.coverage.deleteYear")}
                </Button>
              ) : null}
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  setDeleteConfirm({
                    kind: "list",
                    listId: selectedList.id,
                    listName: selectedList.name,
                  })
                }
              >
                {t("overview.coverage.deleteList")}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedList.years.map((yearRow) => (
                <Button
                  key={yearRow.year}
                  variant="secondary"
                  size="sm"
                  className={cn(
                    selectedYear === yearRow.year &&
                      "ring-2 ring-gray-01 ring-offset-1 ring-offset-gray-05",
                  )}
                  onClick={() => setSelectedYear(yearRow.year)}
                >
                  <span className="text-gray-01">{yearRow.year}</span>
                  <span className="mx-1 text-gray-02">·</span>
                  <span
                    className={`font-semibold tabular-nums ${coveragePercentTextClass(yearRow.coveragePercent)}`}
                  >
                    {yearRow.coveragePercent}%
                  </span>
                </Button>
              ))}
              {selectedList.years.length === 0 ? (
                <p className="text-sm text-gray-02">
                  {t("overview.coverage.noYears")}
                </p>
              ) : null}
            </div>
          </div>

          {selectedYear !== null ? (
            <div className="space-y-3">
              {yearDetail.isLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : yearDetail.error ? (
                <Callout
                  variant="error"
                  title={t("overview.coverage.errorTitle")}
                >
                  <p className="text-sm">{yearDetail.error}</p>
                </Callout>
              ) : yearDetail.detail ? (
                <CoverageYearDetailView
                  listId={selectedList.id}
                  year={selectedYear}
                  detail={yearDetail.detail}
                  filter={yearDetail.filter}
                  onFilterChange={yearDetail.setFilter}
                  search={yearDetail.search}
                  onSearchChange={yearDetail.setSearch}
                  page={yearDetail.page}
                  totalPages={yearDetail.totalPages}
                  pageSize={yearDetail.pageSize}
                  onPageChange={yearDetail.setPage}
                  isRefreshingRegistry={yearDetail.isRefreshingRegistry}
                  onRefreshRegistry={() => void yearDetail.refreshRegistry()}
                  isRematching={yearDetail.isRematching}
                  refreshingEntryId={yearDetail.refreshingEntryId}
                  onRefreshEntryReports={async (entry) => {
                    try {
                      await yearDetail.refreshEntryRegistry(entry.id);
                      toast.success(
                        t("overview.coverage.refreshEntryReportsSuccess", {
                          name: entry.name,
                        }),
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t("overview.coverage.refreshEntryReportsError"),
                      );
                    }
                  }}
                  onRematchCompanies={async (mode) => {
                    try {
                      const result = await yearDetail.rematchCompanies(mode);
                      if (!result) return;
                      toast.success(
                        t("overview.coverage.rematchCompaniesSuccess", {
                          rematched: result.rematchedCount,
                          skipped: result.skippedManualCount,
                          preserved: result.skippedByModeCount,
                          reports: result.reportLinkCount,
                        }),
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t("overview.coverage.rematchCompaniesError"),
                      );
                      throw error;
                    }
                  }}
                  onRegistryReportSaved={(entryId, saved) => {
                    yearDetail.addEntryRegistryReport(entryId, saved);
                  }}
                  onRegistryReportUpdated={(entryId, reportId, updated) => {
                    yearDetail.replaceEntryRegistryReport(
                      entryId,
                      reportId,
                      updated,
                    );
                  }}
                  onEntryReportsLinked={(linkedDetail) => {
                    const entryId = linkedDetail.entries[0]?.id;
                    if (entryId) {
                      yearDetail.applyLinkedEntryReports(linkedDetail, entryId);
                    }
                  }}
                  onEdit={() =>
                    openEditYearDialog(selectedList.id, selectedYear)
                  }
                  onEditEntry={setMatchEntry}
                  renamingEntryId={renamingEntryId}
                  onRenameEntry={async (entry, name) => {
                    setRenamingEntryId(entry.id);
                    try {
                      await yearDetail.renameEntry(entry.id, name);
                      toast.success(t("overview.coverage.renameEntrySuccess"));
                    } catch (error) {
                      throw error instanceof Error
                        ? error
                        : new Error(t("overview.coverage.renameEntryError"));
                    } finally {
                      setRenamingEntryId((current) =>
                        current === entry.id ? null : current,
                      );
                    }
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <CoverageListTable
          lists={coverage.lists}
          groups={coverage.groups}
          onSelectList={openList}
          onCreateList={(groupId) =>
            setDialog({ kind: "createList", groupId: groupId ?? null })
          }
          onEditList={(list) =>
            setDialog({
              kind: "editList",
              listId: list.id,
              listName: list.name,
              groupId: list.group?.id ?? null,
            })
          }
          onManageGroups={() => setDialog({ kind: "manageGroups" })}
        />
      )}

      <CoverageYearFormDialog
        open={dialog.kind !== "closed" && dialog.kind !== "manageGroups"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
        mode={
          dialog.kind === "createList"
            ? "createList"
            : dialog.kind === "addYear"
              ? "addYear"
              : dialog.kind === "editList"
                ? "editList"
                : "editYear"
        }
        groups={coverage.groups}
        initialListName={
          dialog.kind === "editList" ? dialog.listName : undefined
        }
        initialGroupId={
          dialog.kind === "createList"
            ? (dialog.groupId ?? null)
            : dialog.kind === "editList"
              ? dialog.groupId
              : null
        }
        initialYear={
          dialog.kind === "editYear" ? dialog.year : new Date().getFullYear()
        }
        initialNamesText={dialog.kind === "editYear" ? editNamesText : ""}
        isSubmitting={isSubmitting}
        onSubmit={async (input) => {
          if (dialog.kind === "createList") {
            await handleCreateList(input);
            return;
          }
          await handleAddOrEditYear(input);
        }}
      />

      <CoverageManageGroupsDialog
        open={dialog.kind === "manageGroups"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
        groups={coverage.groups}
        onCreate={async (input) => {
          await coverage.createGroup(input);
        }}
        onUpdate={async (groupId, input) => {
          await coverage.updateGroup(groupId, input);
        }}
        onDelete={async (groupId) => {
          await coverage.deleteGroup(groupId);
        }}
      />

      <ConfirmDialog
        open={deleteConfirm.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm({ kind: "closed" });
        }}
        title={
          deleteConfirm.kind === "year"
            ? t("overview.coverage.confirmDeleteYearTitle")
            : t("overview.coverage.confirmDeleteListTitle")
        }
        description={
          deleteConfirm.kind === "year"
            ? t("overview.coverage.confirmDeleteYear", {
                year: deleteConfirm.year,
                name: deleteConfirm.listName,
              })
            : deleteConfirm.kind === "list"
              ? t("overview.coverage.confirmDeleteList", {
                  name: deleteConfirm.listName,
                })
              : ""
        }
        cancelLabel={t("common.cancel")}
        confirmLabel={
          deleteConfirm.kind === "year"
            ? t("overview.coverage.deleteYear")
            : t("overview.coverage.deleteList")
        }
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      <CoverageEntryMatchDialog
        open={matchEntry !== null}
        onOpenChange={(open) => {
          if (!open) setMatchEntry(null);
        }}
        entry={matchEntry}
        isSubmitting={isMatchSubmitting}
        onAction={async (action: CoverageMatchSaveAction) => {
          if (!matchEntry) return;
          setIsMatchSubmitting(true);
          try {
            await yearDetail.setEntryMatch(matchEntry.id, action);
            setMatchEntry(null);
            if (action.type === "clear") {
              toast.success(
                t("overview.coverage.clearMatchSuccess", {
                  name: matchEntry.name,
                }),
              );
            } else if (action.type === "markMissing") {
              toast.success(
                t("overview.coverage.markAsMissingSuccess", {
                  name: matchEntry.name,
                }),
              );
            } else {
              toast.success(
                t("overview.coverage.saveMatchSuccess", {
                  name: matchEntry.name,
                  company: action.companyName,
                }),
              );
            }
          } catch (err) {
            toast.error(
              t("overview.coverage.saveMatchError", {
                name: matchEntry.name,
                message: err instanceof Error ? err.message : "Unknown error",
              }),
            );
          } finally {
            setIsMatchSubmitting(false);
          }
        }}
        onSaveWebsiteUrl={async (websiteUrl) => {
          if (!matchEntry) return;
          const updated = await yearDetail.setEntryCrawlWebsite(
            matchEntry.id,
            websiteUrl,
          );
          const nextEntry =
            updated?.entries.find((entry) => entry.id === matchEntry.id) ??
            null;
          if (nextEntry) setMatchEntry(nextEntry);
        }}
      />
    </div>
  );
}
