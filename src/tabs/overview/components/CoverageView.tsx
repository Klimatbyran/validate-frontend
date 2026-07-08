import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { LoadingSpinner } from "@/ui/loading-spinner";
import {
  useCoverageLists,
  useCoverageYearDetail,
} from "@/tabs/overview/hooks/useCoverageLists";
import { CoverageListTable } from "./CoverageListTable";
import { CoverageYearDetailView } from "./CoverageYearDetail";
import { CoverageYearFormDialog } from "./CoverageYearFormDialog";

type DialogState =
  | { kind: "closed" }
  | { kind: "createList" }
  | { kind: "addYear"; listId: string }
  | { kind: "editYear"; listId: string; year: number; namesText: string };

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

  const selectedList = useMemo(
    () => coverage.lists.find((list) => list.id === selectedListId) ?? null,
    [coverage.lists, selectedListId],
  );

  const yearDetail = useCoverageYearDetail(selectedListId, selectedYear);

  const openList = (listId: string) => {
    setSelectedListId(listId);
    const list = coverage.lists.find((item) => item.id === listId);
    setSelectedYear(list?.years[0]?.year ?? null);
  };

  const handleCreateList = async (input: {
    listName?: string;
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
    year: number;
    names: string[];
  }) => {
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
        await coverage.replaceYearNames(
          dialog.listId,
          dialog.year,
          input.names,
        );
        setSelectedListId(dialog.listId);
        setSelectedYear(dialog.year);
        await yearDetail.refresh();
      } finally {
        setIsSubmitting(false);
      }
    }
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
            <h3 className="text-lg font-semibold text-gray-01">
              {selectedList.name}
            </h3>

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
                  setDialog({ kind: "addYear", listId: selectedList.id })
                }
              >
                {t("overview.coverage.addYear")}
              </Button>
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
                  variant={
                    selectedYear === yearRow.year ? "primary" : "secondary"
                  }
                  size="sm"
                  onClick={() => setSelectedYear(yearRow.year)}
                >
                  {t("overview.coverage.yearPill", {
                    year: yearRow.year,
                    percent: yearRow.coveragePercent,
                  })}
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
                  detail={yearDetail.detail}
                  onEdit={() =>
                    setDialog({
                      kind: "editYear",
                      listId: selectedList.id,
                      year: selectedYear,
                      namesText: yearDetail
                        .detail!.entries.map((e) => e.name)
                        .join("\n"),
                    })
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <CoverageListTable
          lists={coverage.lists}
          onSelectList={openList}
          onCreateList={() => setDialog({ kind: "createList" })}
        />
      )}

      <CoverageYearFormDialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
        mode={
          dialog.kind === "createList"
            ? "createList"
            : dialog.kind === "addYear"
              ? "addYear"
              : "editYear"
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
    </div>
  );
}
