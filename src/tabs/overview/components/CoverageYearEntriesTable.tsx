import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useI18n } from "@/contexts/I18nContext";
import type {
  CoverageEntry,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";
import {
  CoverageEntryRow,
  CoverageSelectCheckbox,
} from "./CoverageEntryRow";

const COVERAGE_ROW_HEIGHT_PX = 56;
const COVERAGE_TABLE_MAX_HEIGHT_PX = 560;
const COVERAGE_TABLE_COL_SPAN = 6;

type CoverageYearEntriesTableProps = {
  entries: CoverageEntry[];
  selectedIds: Set<string>;
  allLoadedSelected: boolean;
  someLoadedSelected: boolean;
  onToggleSelectAllLoaded: () => void;
  onToggleEntrySelected: (entry: CoverageEntry) => void;
  onEditEntry: (entry: CoverageEntry) => void;
  onRefreshEntryReports: (entry: CoverageEntry) => void;
  refreshingEntryId: string | null;
  onFindReportClick: (entry: CoverageEntry) => void;
  onRunReportClick: (entry: CoverageEntry) => void;
  onRunReport: (entry: CoverageEntry, report: RegistryReportPill) => void;
  onReplaceReport: (entry: CoverageEntry, report: RegistryReportPill) => void;
  onRemoveReport: (entry: CoverageEntry, report: RegistryReportPill) => void;
};

export function CoverageYearEntriesTable({
  entries,
  selectedIds,
  allLoadedSelected,
  someLoadedSelected,
  onToggleSelectAllLoaded,
  onToggleEntrySelected,
  onEditEntry,
  onRefreshEntryReports,
  refreshingEntryId,
  onFindReportClick,
  onRunReportClick,
  onRunReport,
  onReplaceReport,
  onRemoveReport,
}: CoverageYearEntriesTableProps) {
  const { t } = useI18n();
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => COVERAGE_ROW_HEIGHT_PX,
    overscan: 12,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  return (
    <div
      ref={tableScrollRef}
      className="overflow-auto rounded-lg border border-gray-03"
      style={{ maxHeight: COVERAGE_TABLE_MAX_HEIGHT_PX }}
    >
      <table className="min-w-full text-sm table-fixed">
        <thead className="sticky top-0 z-10 bg-gray-05/95 text-left text-gray-02 backdrop-blur-sm">
          <tr>
            <th className="w-10 px-3 py-2">
              <CoverageSelectCheckbox
                checked={allLoadedSelected}
                indeterminate={someLoadedSelected}
                onChange={onToggleSelectAllLoaded}
                disabled={entries.length === 0}
                ariaLabel={t("overview.coverage.selectAllLoaded")}
              />
            </th>
            <th className="w-[22%] px-4 py-2 font-medium">
              {t("overview.coverage.columns.listName")}
            </th>
            <th className="w-[13%] px-4 py-2 font-medium">
              {t("overview.coverage.columns.status")}
            </th>
            <th className="w-[21%] px-4 py-2 font-medium">
              {t("overview.coverage.columns.dbMatch")}
            </th>
            <th className="w-[18%] px-4 py-2 font-medium">
              {t("overview.coverage.columns.reports")}
            </th>
            <th className="w-[22%] px-4 py-2 font-medium min-w-[12rem]">
              {t("overview.coverage.columns.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={COVERAGE_TABLE_COL_SPAN}
                className="px-4 py-8 text-center text-gray-02"
              >
                {t("overview.coverage.noEntries")}
              </td>
            </tr>
          ) : (
            <>
              {rowVirtualizer.getVirtualItems().length > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={COVERAGE_TABLE_COL_SPAN}
                    style={{
                      height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
                      padding: 0,
                      border: 0,
                    }}
                  />
                </tr>
              ) : null}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const entry = entries[virtualRow.index];
                if (!entry) return null;

                return (
                  <CoverageEntryRow
                    key={entry.id}
                    entry={entry}
                    selected={selectedIds.has(entry.id)}
                    onToggleSelect={() => onToggleEntrySelected(entry)}
                    rowRef={rowVirtualizer.measureElement}
                    dataIndex={virtualRow.index}
                    onEditEntry={onEditEntry}
                    onRefreshReports={onRefreshEntryReports}
                    isRefreshingReports={refreshingEntryId === entry.id}
                    refreshReportsDisabled={
                      refreshingEntryId != null &&
                      refreshingEntryId !== entry.id
                    }
                    onFindReportClick={() => onFindReportClick(entry)}
                    onRunReportClick={() => onRunReportClick(entry)}
                    onRunReport={(report) => onRunReport(entry, report)}
                    onReplaceReport={(report) => onReplaceReport(entry, report)}
                    onRemoveReport={(report) => onRemoveReport(entry, report)}
                  />
                );
              })}
              {rowVirtualizer.getVirtualItems().length > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={COVERAGE_TABLE_COL_SPAN}
                    style={{
                      height:
                        rowVirtualizer.getTotalSize() -
                        (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                      padding: 0,
                      border: 0,
                    }}
                  />
                </tr>
              ) : null}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
