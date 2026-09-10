import { useEffect, useState } from "react";
import { Check, Minus, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import { groupRegistryReportsByYear } from "@/tabs/overview/lib/coverage-registry-report-run";
import type {
  CoverageEntry,
  RegistryReportPill,
} from "@/tabs/overview/lib/coverage-types";
import { ReportYearTypeDropdown } from "./ReportYearTypeDropdown";

export function CoverageSelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange();
      }}
      className={`flex items-center justify-center ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <span
        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
          checked || indeterminate
            ? "bg-blue-03 border-blue-03"
            : "border-gray-03"
        }`}
        aria-hidden
      >
        {checked ? (
          <Check className="w-3 h-3 text-white" />
        ) : indeterminate ? (
          <Minus className="w-3 h-3 text-white" />
        ) : null}
      </span>
    </button>
  );
}

type CoverageEntryRowProps = {
  entry: CoverageEntry;
  selected: boolean;
  onToggleSelect: () => void;
  rowRef: (element: HTMLTableRowElement | null) => void;
  dataIndex: number;
  onEditEntry: (entry: CoverageEntry) => void;
  onRenameEntry: (entry: CoverageEntry, name: string) => Promise<void>;
  renamingEntryId: string | null;
  onRefreshReports: (entry: CoverageEntry) => void;
  isRefreshingReports: boolean;
  refreshReportsDisabled: boolean;
  onFindReportClick: () => void;
  onRunReportClick: () => void;
  onRunReport: (report: RegistryReportPill) => void;
  onReplaceReport: (report: RegistryReportPill) => void;
  onRemoveReport: (report: RegistryReportPill) => void;
  onConfirmReport: (report: RegistryReportPill) => void;
};

export function CoverageEntryRow({
  entry,
  selected,
  onToggleSelect,
  rowRef,
  dataIndex,
  onEditEntry,
  onRenameEntry,
  renamingEntryId,
  onRefreshReports,
  isRefreshingReports,
  refreshReportsDisabled,
  onFindReportClick,
  onRunReportClick,
  onRunReport,
  onReplaceReport,
  onRemoveReport,
  onConfirmReport,
}: CoverageEntryRowProps) {
  const { t } = useI18n();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(entry.name);
  const [renameError, setRenameError] = useState<string | null>(null);

  const isRenaming = renamingEntryId === entry.id;

  useEffect(() => {
    if (!isEditingName) {
      setDraftName(entry.name);
      setRenameError(null);
    }
  }, [entry.name, isEditingName]);

  const statusLabel =
    entry.status === "matched"
      ? t("overview.coverage.filters.matched")
      : entry.status === "missing"
        ? t("overview.coverage.filters.missing")
        : t("overview.coverage.filters.ambiguous");

  const statusClass =
    entry.status === "matched"
      ? "text-green-03"
      : entry.status === "missing"
        ? "text-orange-03"
        : "text-yellow-400";

  const reports = entry.registryReports ?? [];
  const yearGroups = groupRegistryReportsByYear(reports);
  const canRunReport = reports.length > 0;

  const cancelNameEdit = () => {
    setIsEditingName(false);
    setDraftName(entry.name);
    setRenameError(null);
  };

  const saveNameEdit = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setRenameError(t("overview.coverage.renameEntryEmpty"));
      return;
    }
    if (nextName === entry.name) {
      cancelNameEdit();
      return;
    }
    setRenameError(null);
    try {
      await onRenameEntry(entry, nextName);
      setIsEditingName(false);
    } catch (error) {
      setRenameError(
        error instanceof Error
          ? error.message
          : t("overview.coverage.renameEntryError"),
      );
    }
  };

  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
      className={`border-t border-gray-03/60 ${selected ? "bg-blue-03/5" : ""}`}
    >
      <td className="px-3 py-2 align-top">
        <CoverageSelectCheckbox
          checked={selected}
          onChange={onToggleSelect}
          ariaLabel={t("overview.coverage.selectCompany", {
            name: entry.name,
          })}
        />
      </td>
      <td className="px-4 py-2 text-gray-01 align-top">
        {isEditingName ? (
          <div className="flex min-w-[12rem] flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveNameEdit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelNameEdit();
                  }
                }}
                disabled={isRenaming}
                autoFocus
                aria-label={t("overview.coverage.renameEntryLabel")}
                className="w-full rounded border border-gray-03 bg-gray-05 px-2 py-1 text-sm text-gray-01"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void saveNameEdit()}
                disabled={isRenaming}
              >
                {isRenaming
                  ? t("overview.coverage.renameEntrySaving")
                  : t("overview.coverage.renameEntrySave")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelNameEdit}
                disabled={isRenaming}
              >
                {t("overview.coverage.renameEntryCancel")}
              </Button>
            </div>
            {renameError ? (
              <p className="text-xs text-orange-03">{renameError}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <span className="truncate" title={entry.name}>
              {entry.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0"
              aria-label={t("overview.coverage.renameEntry")}
              title={t("overview.coverage.renameEntry")}
              onClick={() => {
                setDraftName(entry.name);
                setRenameError(null);
                setIsEditingName(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
      <td className={`px-4 py-2 font-medium align-top ${statusClass}`}>
        <span>{statusLabel}</span>
        {entry.matchMethod === "manual" ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-03">
            {t("overview.coverage.manualBadge")}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2 text-gray-02 align-top truncate">
        {entry.matchedCompany ? (
          <Link
            to={editorCompanyPath(
              entry.matchedCompany.wikidataId ?? entry.matchedCompany.id,
            )}
            className="text-blue-03 hover:underline"
          >
            {entry.matchedCompany.name}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2 align-top">
        {yearGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {yearGroups.map((group) => (
              <ReportYearTypeDropdown
                key={group.year ?? "unknown"}
                group={group}
                onRun={onRunReport}
                onReplace={onReplaceReport}
                onRemove={onRemoveReport}
                onConfirm={onConfirmReport}
              />
            ))}
          </div>
        ) : (
          <span className="font-medium text-gray-02">
            {t("overview.coverage.reports.missing")}
          </span>
        )}
      </td>
      <td className="px-4 py-2 align-top">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditEntry(entry)}
          >
            {t("overview.coverage.editMatch")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefreshReports(entry)}
            disabled={refreshReportsDisabled || isRefreshingReports}
          >
            {isRefreshingReports
              ? t("overview.coverage.refreshEntryReportsRunning")
              : t("overview.coverage.refreshEntryReports")}
          </Button>
          <Button variant="outline" size="sm" onClick={onFindReportClick}>
            {t("overview.coverage.findReport")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRunReportClick}
            disabled={!canRunReport}
            title={
              canRunReport
                ? undefined
                : t("overview.coverage.runReportDisabled")
            }
          >
            {t("overview.coverage.runReport")}
          </Button>
        </div>
      </td>
    </tr>
  );
}
