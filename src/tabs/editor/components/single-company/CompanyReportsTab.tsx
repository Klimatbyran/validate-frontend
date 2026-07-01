import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { LoadingSpinner } from "@/ui/loading-spinner";
import {
  fetchCompanyReports,
  updateCompanyReportYear,
} from "../../lib/companies-api";
import {
  buildCompanyReportOverview,
  getReportCatalogYearMax,
  isValidReportCatalogYear,
  type CompanyReportOverviewRow,
} from "../../lib/company-report-overview";
import type { GarboCompanyDetail } from "../../lib/types";
import { CompanyReportOverviewTableRow } from "./CompanyReportOverviewTableRow";
import { LinkRegistryReportModal } from "./LinkRegistryReportModal";

export function CompanyReportsTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const currentYear = getReportCatalogYearMax();

  const [companyReports, setCompanyReports] = useState<
    Awaited<ReturnType<typeof fetchCompanyReports>>
  >([]);
  const [loadingShells, setLoadingShells] = useState(true);
  const [shellsError, setShellsError] = useState<string | null>(null);

  const [editedYears, setEditedYears] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<CompanyReportOverviewRow | null>(
    null,
  );

  const loadCompanyReports = (signal?: AbortSignal) => {
    setLoadingShells(true);
    setShellsError(null);
    return fetchCompanyReports(company.id, signal)
      .then((reports) => {
        if (signal?.aborted) return;
        setCompanyReports(reports);
      })
      .catch((error) => {
        if (signal?.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : t("editor.singleCompanyView.companyReports.loadFailed");
        setShellsError(message);
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingShells(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCompanyReports(controller.signal);
    return () => controller.abort();
  }, [company.id]);

  useEffect(() => {
    setEditedYears({});
  }, [company.id]);

  const rows = useMemo(
    () =>
      buildCompanyReportOverview(
        companyReports,
        company.reportingPeriods ?? [],
      ),
    [companyReports, company.reportingPeriods],
  );

  const rowKey = (row: CompanyReportOverviewRow) =>
    row.isUnlinked ? row.shellKey : row.companyReportId;

  const displayYear = (row: CompanyReportOverviewRow) => {
    const key = rowKey(row);
    const edited = editedYears[key];
    if (edited !== undefined) return edited;
    return row.companyReportYear ?? "";
  };

  const isYearDirty = (row: CompanyReportOverviewRow) => {
    const key = rowKey(row);
    const edited = editedYears[key];
    if (edited === undefined) return false;
    return edited !== (row.companyReportYear ?? "");
  };

  const handleSaveYear = async (row: CompanyReportOverviewRow) => {
    const nextYear = displayYear(row).trim();
    if (!isValidReportCatalogYear(nextYear)) {
      toast.error(
        t("editor.singleCompanyView.companyReports.invalidYear", {
          maxYear: String(currentYear),
        }),
      );
      return;
    }

    setSavingId(row.companyReportId);
    try {
      await updateCompanyReportYear(company.id, row.companyReportId, nextYear);
      toast.success(t("editor.singleCompanyView.companyReports.yearSaved"));
      setEditedYears((prev) => {
        const next = { ...prev };
        delete next[rowKey(row)];
        return next;
      });
      await loadCompanyReports();
      onSaved?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("editor.singleCompanyView.companyReports.yearSaveFailed");
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  const handleLinked = async () => {
    await loadCompanyReports();
    onSaved?.();
  };

  if (loadingShells) {
    return (
      <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full flex justify-center py-12">
        <LoadingSpinner />
      </section>
    );
  }

  if (shellsError) {
    return (
      <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
        <p className="text-sm text-red-500">{shellsError}</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
        <p className="text-sm text-gray-02">
          {t("editor.singleCompanyView.companyReports.empty")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
      <div className="border-b border-gray-03/60 pb-6 mb-6">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-01 tracking-tight">
            {t("editor.singleCompanyView.tabs.companyReports")}
          </h2>
          <p className="text-xs text-gray-02 mt-2 leading-relaxed">
            {t("editor.singleCompanyView.companyReportsDataHint")}
          </p>
          <details className="mt-3 text-xs text-gray-02">
            <summary className="cursor-pointer select-none hover:text-gray-01">
              {t(
                "editor.singleCompanyView.companyReports.relationshipDetailsLabel",
              )}
            </summary>
            <p className="mt-2 font-mono break-all leading-relaxed">
              {t("editor.singleCompanyView.companyReports.relationship")}
            </p>
          </details>
        </div>
      </div>

      <DataTableShell>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="text-left">
                {t(
                  "editor.singleCompanyView.companyReports.columns.companyReportYear",
                )}
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
            {rows.map((row) => (
              <CompanyReportOverviewTableRow
                key={row.shellKey}
                row={row}
                displayYear={displayYear(row)}
                isYearDirty={isYearDirty(row)}
                savingYear={savingId === row.companyReportId}
                onYearChange={(value) =>
                  setEditedYears((prev) => ({
                    ...prev,
                    [rowKey(row)]: value,
                  }))
                }
                onSaveYear={() => void handleSaveYear(row)}
                onLinkRegistry={() => setLinkTarget(row)}
              />
            ))}
          </DataTableBody>
        </DataTable>
      </DataTableShell>

      {linkTarget ? (
        <LinkRegistryReportModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setLinkTarget(null);
          }}
          companyId={company.id}
          companyReportId={
            linkTarget.isUnlinked ? undefined : linkTarget.companyReportId
          }
          reportingPeriodIds={
            linkTarget.isUnlinked ? linkTarget.periodIds : undefined
          }
          currentRegistryReportId={linkTarget.registryReportId}
          onLinked={() => void handleLinked()}
        />
      ) : null}
    </section>
  );
}
