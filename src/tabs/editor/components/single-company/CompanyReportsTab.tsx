import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Link2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { reportHrefLinkPillClassName } from "@/lib/report-url-link-pill";
import { Button } from "@/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { updateCompanyReportYear } from "../../lib/companies-api";
import { inputClassName } from "../../lib/company-edit-utils";
import {
  buildCompanyReportOverview,
  isUnlinkedCompanyReportRow,
  registryYearMismatch,
  type CompanyReportOverviewRow,
} from "../../lib/company-report-overview";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import { editorSecondaryIdTextClass } from "../../lib/reporting-period-ui";
import type { GarboCompanyDetail } from "../../lib/types";
import { LinkRegistryReportModal } from "./LinkRegistryReportModal";

const REPORT_YEAR_PATTERN = /^\d{4}$/;

function isValidReportCatalogYear(year: string): boolean {
  if (!REPORT_YEAR_PATTERN.test(year)) return false;
  const n = Number(year);
  return n >= 1990 && n <= 2100;
}

function pickReportLink(row: CompanyReportOverviewRow): string | null {
  const registry = row.registryReport;
  return (
    registry?.url?.trim() ||
    registry?.sourceUrl?.trim() ||
    row.sampleReportUrl?.trim() ||
    row.sampleSourceUrl?.trim() ||
    null
  );
}

function pickS3Link(row: CompanyReportOverviewRow): string | null {
  return (
    row.registryReport?.s3Url?.trim() || row.sampleS3Url?.trim() || null
  );
}

export function CompanyReportsTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");

  const rows = useMemo(() => buildCompanyReportOverview(company), [company]);

  const [editedYears, setEditedYears] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<CompanyReportOverviewRow | null>(
    null,
  );

  useEffect(() => {
    setEditedYears({});
  }, [company.id, rows]);

  const setYearForRow = (companyReportId: string, value: string) => {
    setEditedYears((prev) => ({ ...prev, [companyReportId]: value }));
  };

  const displayYear = (row: CompanyReportOverviewRow) => {
    const edited = editedYears[row.companyReportId];
    if (edited !== undefined) return edited;
    return row.reportYear ?? "";
  };

  const isDirty = (row: CompanyReportOverviewRow) => {
    const edited = editedYears[row.companyReportId];
    if (edited === undefined) return false;
    return edited !== (row.reportYear ?? "");
  };

  const handleSaveYear = async (row: CompanyReportOverviewRow) => {
    const nextYear = displayYear(row).trim();
    if (!isValidReportCatalogYear(nextYear)) {
      toast.error(t("editor.singleCompanyView.companyReports.invalidYear"));
      return;
    }

    setSavingId(row.companyReportId);
    try {
      await updateCompanyReportYear(company.id, row.companyReportId, nextYear);
      toast.success(t("editor.singleCompanyView.companyReports.yearSaved"));
      setEditedYears((prev) => {
        const next = { ...prev };
        delete next[row.companyReportId];
        return next;
      });
      onSaved?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update company report year.";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  const openLinkModal = (row: CompanyReportOverviewRow) => {
    setLinkTarget(row);
    setLinkModalOpen(true);
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-02">
        {t("editor.singleCompanyView.noReportingPeriods")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-03 bg-gray-05/60 px-4 py-3 space-y-2">
        <p className="text-sm text-gray-01">
          {t("editor.singleCompanyView.companyReports.hint")}
        </p>
        <p className="text-xs text-gray-02 font-mono break-all">
          {t("editor.singleCompanyView.companyReports.relationship")}
        </p>
      </div>

      <DataTableShell>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReports.columns.reportYear")}
              </th>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReportId")}
              </th>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReports.columns.registry")}
              </th>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReports.columns.dataYears")}
              </th>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReports.columns.periods")}
              </th>
              <th className="text-left">
                {t("editor.singleCompanyView.companyReports.columns.links")}
              </th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((row) => {
              const unlinked = isUnlinkedCompanyReportRow(row);
              const mismatch = registryYearMismatch(row);
              const reportLink = pickReportLink(row);
              const s3Link = pickS3Link(row);
              const saving = savingId === row.companyReportId;

              return (
                <tr key={row.shellKey}>
                  <td className="align-top min-w-[140px]">
                    {unlinked ? (
                      <span className="text-sm text-gray-02">{dash}</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          className={`${inputClassName} max-w-[7rem] !py-1.5 !text-sm`}
                          value={displayYear(row)}
                          onChange={(e) =>
                            setYearForRow(row.companyReportId, e.target.value)
                          }
                          aria-label={t(
                            "editor.singleCompanyView.companyReports.columns.reportYear",
                          )}
                        />
                        {isDirty(row) ? (
                          <Button
                            type="button"
                            size="sm"
                            className={editorPrimaryActionButtonClass}
                            disabled={saving}
                            onClick={() => handleSaveYear(row)}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span className="ml-1.5">
                              {t("editor.singleCompanyView.companyReports.saveYear")}
                            </span>
                          </Button>
                        ) : null}
                        {mismatch ? (
                          <div className="flex items-start gap-1.5 text-xs text-orange-03">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              {t(
                                "editor.singleCompanyView.companyReports.registryYearMismatch",
                                {
                                  companyYear: row.reportYear,
                                  registryYear:
                                    row.registryReport?.reportYear ?? dash,
                                },
                              )}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="align-top">
                    {unlinked ? (
                      <span className="text-sm text-gray-02">
                        {t("editor.periodEditor.unlinkedReportShell")}
                      </span>
                    ) : (
                      <span className={editorSecondaryIdTextClass}>
                        {row.companyReportId}
                      </span>
                    )}
                  </td>
                  <td className="align-top min-w-[180px]">
                    {unlinked ? (
                      <span className="text-sm text-gray-02">{dash}</span>
                    ) : row.registryReportId ? (
                      <div className="space-y-2">
                        <div className={editorSecondaryIdTextClass}>
                          {row.registryReportId}
                        </div>
                        {row.registryReport?.reportYear ? (
                          <div className="text-xs text-gray-02">
                            {t("editor.companies.reportYear")}:{" "}
                            {row.registryReport.reportYear}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-02">
                            {t("editor.singleCompanyView.noReportYear")}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openLinkModal(row)}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span className="ml-1.5">
                            {t(
                              "editor.singleCompanyView.companyReports.changeRegistryLink",
                            )}
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-sm text-gray-02">
                          {t(
                            "editor.singleCompanyView.companyReports.notLinkedToRegistry",
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openLinkModal(row)}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span className="ml-1.5">
                            {t(
                              "editor.singleCompanyView.companyReports.linkRegistry",
                            )}
                          </span>
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="align-top text-sm text-gray-01">
                    {row.periodDataYears.length
                      ? row.periodDataYears.join(", ")
                      : dash}
                  </td>
                  <td className="align-top text-sm text-gray-01">
                    {row.periodCount}
                  </td>
                  <td className="align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      {reportLink ? (
                        <a
                          href={reportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={reportHrefLinkPillClassName}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t("editor.singleCompanyView.companyReports.reportLink")}
                        </a>
                      ) : null}
                      {s3Link ? (
                        <a
                          href={s3Link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={reportHrefLinkPillClassName}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t("editor.singleCompanyView.companyReports.s3Link")}
                        </a>
                      ) : null}
                      {!reportLink && !s3Link ? (
                        <span className="text-sm text-gray-02">{dash}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTableBody>
        </DataTable>
      </DataTableShell>

      {linkTarget && !isUnlinkedCompanyReportRow(linkTarget) ? (
        <LinkRegistryReportModal
          open={linkModalOpen}
          onOpenChange={(open) => {
            setLinkModalOpen(open);
            if (!open) setLinkTarget(null);
          }}
          companyId={company.id}
          companyReportId={linkTarget.companyReportId}
          currentRegistryReportId={linkTarget.registryReportId}
          onLinked={onSaved}
        />
      ) : null}
    </div>
  );
}
