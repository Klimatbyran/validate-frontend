import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { CompanyRow } from "../types";
import { DatapointErrorStatus } from "../lib";

const textareaClassName =
  "w-full bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20 placeholder-gray-02 min-h-[90px] resize-y";
const inputClassName =
  "w-full bg-gray-03 text-gray-01 rounded px-3 py-2 text-sm border border-gray-02/20 placeholder-gray-02";

const STATUS_OPTIONS: DatapointErrorStatus[] = ["OPEN", "RESOLVED", "WONT_FIX"];

export interface ErrorReasonSaveInput {
  errorReason: string;
  status: DatapointErrorStatus;
  previousValue?: number | null;
  newValue?: number | null;
}

export function ErrorReasonDialog({
  open,
  onOpenChange,
  row,
  dataPointLabel,
  saving,
  loading,
  initialReason,
  initialStatus,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CompanyRow | null;
  dataPointLabel: string;
  saving: boolean;
  /** True while fetching the existing note (and the real datapoint id) for this row. */
  loading?: boolean;
  /** Existing reason to prefill, once loaded. */
  initialReason?: string;
  /** Existing status to prefill, once loaded. Defaults to OPEN for a new note. */
  initialStatus?: DatapointErrorStatus | null;
  onSave: (input: ErrorReasonSaveInput) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [errorReason, setErrorReason] = useState("");
  const [status, setStatus] = useState<DatapointErrorStatus>("OPEN");
  const [correctedValue, setCorrectedValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setErrorReason(initialReason ?? "");
    setStatus(initialStatus ?? "OPEN");
    setCorrectedValue("");
  }, [open, row?.rowKey, initialReason, initialStatus]);

  const statusLabel = (value: DatapointErrorStatus) =>
    t(
      `errors.reasonDialog.status${value === "WONT_FIX" ? "WontFix" : value === "OPEN" ? "Open" : "Resolved"}`,
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("errors.reasonDialog.title", { dataPoint: dataPointLabel })}
      description={
        row
          ? t("errors.reasonDialog.description", { company: row.name })
          : undefined
      }
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("errors.reasonDialog.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() =>
              onSave({
                errorReason: errorReason.trim(),
                status,
                previousValue:
                  status === "RESOLVED" && correctedValue.trim() !== ""
                    ? (row?.stageValue ?? null)
                    : undefined,
                newValue:
                  status === "RESOLVED" && correctedValue.trim() !== ""
                    ? Number(correctedValue)
                    : undefined,
              })
            }
            disabled={saving || !!loading || !errorReason.trim()}
          >
            {saving
              ? t("errors.reasonDialog.saving")
              : t("errors.reasonDialog.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="block text-sm font-medium text-gray-01">
            {t("errors.reasonDialog.label")}
          </label>
          <textarea
            value={errorReason}
            onChange={(e) => setErrorReason(e.target.value)}
            className={textareaClassName}
            placeholder={
              loading
                ? t("errors.reasonDialog.loadingExisting")
                : t("errors.reasonDialog.placeholder")
            }
            disabled={!!loading}
            rows={3}
            autoFocus
          />
        </div>

        <div className="grid gap-2">
          <label className="block text-sm font-medium text-gray-01">
            {t("errors.reasonDialog.statusLabel")}
          </label>
          <SingleSelectDropdown
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => setStatus(v as DatapointErrorStatus)}
            getOptionLabel={(v) => statusLabel(v as DatapointErrorStatus)}
            ariaLabel={t("errors.reasonDialog.statusLabel")}
          />
        </div>

        {status === "RESOLVED" && (
          <div className="grid gap-2">
            <label className="block text-sm font-medium text-gray-01">
              {t("errors.reasonDialog.correctedValueLabel")}{" "}
              <span className="text-sm font-normal text-gray-02">
                {t("errors.reasonDialog.optional")}
              </span>
            </label>
            <input
              type="number"
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              className={inputClassName}
              placeholder={t("errors.reasonDialog.correctedValuePlaceholder")}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
