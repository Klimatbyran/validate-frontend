import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import {
  fetchCompanyRegistryReports,
  updateCompanyReport,
} from "../../lib/companies-api";
import { formatRegistryOptionLabel } from "../../lib/registry-report-display";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import { editorSecondaryIdTextClass } from "../../lib/reporting-period-ui";
import type { GarboRegistryReportSummary } from "../../lib/types";

function isRegistryReportWithId(
  report: GarboRegistryReportSummary,
): report is GarboRegistryReportSummary & { id: string } {
  return Boolean(report.id?.trim());
}

export function LinkRegistryReportModal({
  open,
  onOpenChange,
  companyId,
  companyReportId,
  currentRegistryReportId,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyReportId: string;
  currentRegistryReportId?: string | null;
  onLinked?: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const noYearLabel = t("editor.singleCompanyView.noReportYear");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<GarboRegistryReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setOptions([]);
    setSelectedId(currentRegistryReportId?.trim() || null);

    fetchCompanyRegistryReports(companyId, controller.signal)
      .then((reports) => {
        setOptions(reports.filter(isRegistryReportWithId));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : t("editor.singleCompanyView.companyReports.linkModal.loadFailed");
        setLoadError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, companyId, currentRegistryReportId, t]);

  const optionsById = useMemo(() => {
    const map = new Map<string, GarboRegistryReportSummary>();
    for (const report of options) {
      if (report.id) map.set(report.id, report);
    }
    return map;
  }, [options]);

  const selectedOption = selectedId ? optionsById.get(selectedId) : undefined;

  const canSave =
    Boolean(selectedId) &&
    selectedId !== (currentRegistryReportId?.trim() || "");

  const handleSave = async () => {
    if (!selectedId) return;

    setSaving(true);
    try {
      await updateCompanyReport(companyId, companyReportId, {
        registryReportId: selectedId,
      });
      toast.success(
        t("editor.singleCompanyView.companyReports.linkModal.linked"),
      );
      onOpenChange(false);
      onLinked?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("editor.singleCompanyView.companyReports.linkModal.linkFailed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("editor.singleCompanyView.companyReports.linkModal.title")}
      description={t(
        "editor.singleCompanyView.companyReports.linkModal.description",
      )}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("editor.singleCompanyView.companyReports.linkModal.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            className={editorPrimaryActionButtonClass}
            disabled={!canSave || saving || loading}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span className={saving ? "ml-1.5" : undefined}>
              {t("editor.singleCompanyView.companyReports.linkModal.save")}
            </span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={editorSecondaryIdTextClass}>{companyReportId}</div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-02">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("editor.singleCompanyView.companyReports.linkModal.loading")}
          </div>
        ) : loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-02">
            {t("editor.singleCompanyView.companyReports.linkModal.empty")}
          </p>
        ) : (
          <>
            <SingleSelectDropdown
              options={options.map((option) => option.id!)}
              value={selectedId ?? ""}
              onChange={(value) => setSelectedId(value || null)}
              getOptionLabel={(id) => {
                const option = optionsById.get(id);
                return option
                  ? formatRegistryOptionLabel(option, noYearLabel)
                  : dash;
              }}
              placeholder={t(
                "editor.singleCompanyView.companyReports.linkModal.placeholder",
              )}
              triggerClassName="w-full !h-auto min-h-9 !text-sm px-3 py-2"
            />
            {selectedOption?.id ? (
              <p className="text-xs text-gray-02 break-all">
                {selectedOption.id}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
