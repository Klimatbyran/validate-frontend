import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { GarboCompanyDetail, GarboCompanyListItem } from "../../lib/types";
import { getCompany, updateReportingPeriods } from "../../lib/companies-api";
import { inputClassName } from "../../lib/company-edit-utils";
import {
  formatReportShellOptionLabel,
  groupPeriodsByReportShell,
  NEW_REPORT_SHELL_KEY,
  UNLINKED_REPORT_SHELL_KEY,
} from "../../lib/company-report-shells";
import { ReportingPeriodQuickEditModal } from "./ReportingPeriodQuickEditModal";
import { getPeriodYear } from "../../lib/reporting-period-ui";

function ymdToIsoStartOfDay(ymd: string) {
  return `${ymd}T00:00:00.000Z`;
}

function detailToListItem(d: GarboCompanyDetail): GarboCompanyListItem {
  return {
    id: d.id,
    wikidataId: d.wikidataId,
    name: d.name,
    tags: d.tags,
    reportingPeriods: d.reportingPeriods,
    industry: d.industry,
    hasUnverifiedEmissions: d.hasUnverifiedEmissions,
    hasUnverifiedData: d.hasUnverifiedData,
  };
}

function defaultTargetShellKey(
  shells: ReturnType<typeof groupPeriodsByReportShell>,
): string {
  const linkedShells = shells.filter(
    (shell) => shell.shellKey !== UNLINKED_REPORT_SHELL_KEY,
  );
  if (linkedShells.length === 1) {
    return linkedShells[0]!.shellKey;
  }
  return NEW_REPORT_SHELL_KEY;
}

// TODO: "New company report" omits companyReportId; Garbo only links CompanyReport → Report
// registry when the save carries URL/S3/hash identity. New report + no URL creates an
// unlinked company report (registryReportId null). Add UX to pick an existing Report row or set
// report identity explicitly (registry tab / GET .../reports) before prod manual entry relies on this.
function companyReportIdForTargetShell(targetShellKey: string): string | undefined {
  if (
    targetShellKey === NEW_REPORT_SHELL_KEY ||
    targetShellKey === UNLINKED_REPORT_SHELL_KEY
  ) {
    return undefined;
  }
  return targetShellKey;
}

export function AddReportingPeriodFlow({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const shells = useMemo(
    () => groupPeriodsByReportShell(company.reportingPeriods ?? []),
    [company.reportingPeriods],
  );
  const shellOptions = useMemo(() => {
    const linked = shells.filter(
      (shell) => shell.shellKey !== UNLINKED_REPORT_SHELL_KEY,
    );
    return [
      {
        shellKey: NEW_REPORT_SHELL_KEY,
        label: t("editor.singleCompanyView.addReportingPeriod.newReportShell"),
      },
      ...linked.map((shell) => ({
        shellKey: shell.shellKey,
        label: formatReportShellOptionLabel(shell, {
          reportYear: t("editor.companies.reportYear"),
          noReportYear: t("editor.singleCompanyView.noReportYear"),
          unlinkedShell: t("editor.periodEditor.unlinkedReportShell"),
          companyReportId: t("editor.singleCompanyView.companyReportId"),
        }),
      })),
    ];
  }, [shells, t]);

  const [step1Open, setStep1Open] = useState(false);
  const [startYmd, setStartYmd] = useState("");
  const [endYmd, setEndYmd] = useState("");
  const [reportURL, setReportURL] = useState("");
  const [targetShellKey, setTargetShellKey] = useState(() =>
    defaultTargetShellKey(shells),
  );
  const [creating, setCreating] = useState(false);
  const [quickEdit, setQuickEdit] = useState<{
    listItem: GarboCompanyListItem;
    year: string;
    periodMatch: { startDate: string; endDate: string };
    companyReportId?: string;
  } | null>(null);

  const resetStep1Form = () => {
    setStartYmd("");
    setEndYmd("");
    setReportURL("");
    setTargetShellKey(defaultTargetShellKey(shells));
  };

  const handleOpenStep1 = () => {
    resetStep1Form();
    setStep1Open(true);
  };

  const handleStep1Continue = async () => {
    if (!startYmd || !endYmd) {
      toast.error(
        t("editor.singleCompanyView.addReportingPeriod.validationDates"),
      );
      return;
    }
    if (startYmd > endYmd) {
      toast.error(
        t("editor.singleCompanyView.addReportingPeriod.validationOrder"),
      );
      return;
    }

    const startDate = ymdToIsoStartOfDay(startYmd);
    const endDate = ymdToIsoStartOfDay(endYmd);
    const url = reportURL.trim();
    const companyReportId = companyReportIdForTargetShell(targetShellKey);

    setCreating(true);
    try {
      await updateReportingPeriods(company.id, {
        reportingPeriods: [
          {
            startDate,
            endDate,
            reportURL: url || undefined,
            ...(companyReportId ? { companyReportId } : {}),
          },
        ],
      });
      const fresh = await getCompany(company.id);
      onSaved?.();
      const year = getPeriodYear({ startDate, endDate });
      if (!year) {
        toast.error(
          t("editor.singleCompanyView.addReportingPeriod.validationYear"),
        );
        setCreating(false);
        return;
      }
      setStep1Open(false);
      resetStep1Form();
      setQuickEdit({
        listItem: detailToListItem(fresh),
        year,
        periodMatch: { startDate, endDate },
        companyReportId,
      });
      toast.success(t("editor.singleCompanyView.addReportingPeriod.created"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleOpenStep1}
        className="max-w-none min-w-0 whitespace-nowrap text-xs px-3.5 h-8"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
        {t("editor.singleCompanyView.addReportingPeriod.button")}
      </Button>

      <Dialog
        open={step1Open}
        onOpenChange={(o) => !creating && setStep1Open(o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-01">
              {t("editor.singleCompanyView.addReportingPeriod.step1Title")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "editor.singleCompanyView.addReportingPeriod.step1Description",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shellOptions.length > 1 ? (
              <div>
                <label className="block text-xs font-medium text-gray-01 mb-1">
                  {t("editor.singleCompanyView.addReportingPeriod.targetReportShell")}
                </label>
                <select
                  value={targetShellKey}
                  onChange={(e) => setTargetShellKey(e.target.value)}
                  className={inputClassName + " bg-gray-04 w-full min-w-0 !max-w-none"}
                >
                  {shellOptions.map((option) => (
                    <option key={option.shellKey} value={option.shellKey}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-02">
                  {t("editor.singleCompanyView.addReportingPeriod.targetReportShellHint")}
                </p>
              </div>
            ) : null}
            <div>
              <label className="block text-xs font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.reportingPeriodStart")}
              </label>
              <input
                type="date"
                value={startYmd}
                onChange={(e) => setStartYmd(e.target.value)}
                className={
                  inputClassName + " bg-gray-04 w-full min-w-0 !max-w-none"
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.reportingPeriodEnd")}
              </label>
              <input
                type="date"
                value={endYmd}
                onChange={(e) => setEndYmd(e.target.value)}
                className={
                  inputClassName + " bg-gray-04 w-full min-w-0 !max-w-none"
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-01 mb-1">
                {t("editor.companies.reportUrl")}
              </label>
              <input
                type="url"
                value={reportURL}
                onChange={(e) => setReportURL(e.target.value)}
                className={
                  inputClassName + " bg-gray-04 w-full min-w-0 !max-w-none"
                }
                placeholder={t("editor.fieldEdit.sourcePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep1Open(false)}
              disabled={creating}
            >
              {t("editor.fieldEdit.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleStep1Continue}
              disabled={creating}
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t(
                "editor.singleCompanyView.addReportingPeriod.continueToEconomyEmissions",
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quickEdit ? (
        <ReportingPeriodQuickEditModal
          open
          onOpenChange={(open) => {
            if (!open) setQuickEdit(null);
          }}
          company={quickEdit.listItem}
          year={quickEdit.year}
          periodMatch={quickEdit.periodMatch}
          companyReportId={quickEdit.companyReportId}
          onSaved={() => {
            onSaved?.();
          }}
        />
      ) : null}
    </>
  );
}
