import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import type { CoverageRematchMode } from "@/tabs/overview/lib/coverage-types";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

const REMATCH_MODES: CoverageRematchMode[] = [
  "missing",
  "missingAndAmbiguous",
  "full",
];

type CoverageRematchModeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting?: boolean;
  onConfirm: (mode: CoverageRematchMode) => Promise<void>;
};

export function CoverageRematchModeDialog({
  open,
  onOpenChange,
  isSubmitting = false,
  onConfirm,
}: CoverageRematchModeDialogProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<CoverageRematchMode>("missing");

  useEffect(() => {
    if (open) setMode("missing");
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("overview.coverage.rematchDialogTitle")}
      description={t("overview.coverage.rematchDialogDescription")}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => void onConfirm(mode)}
          >
            {isSubmitting
              ? t("overview.coverage.rematchCompaniesRunning")
              : t("overview.coverage.rematchCompanies")}
          </Button>
        </div>
      }
    >
      <fieldset className="space-y-3" disabled={isSubmitting}>
        <legend className="sr-only">
          {t("overview.coverage.rematchDialogTitle")}
        </legend>
        {REMATCH_MODES.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-03 px-3 py-2 hover:bg-gray-04/40"
          >
            <input
              type="radio"
              name="coverage-rematch-mode"
              className="mt-1"
              checked={mode === option}
              onChange={() => setMode(option)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-gray-01">
                {t(`overview.coverage.rematchModes.${option}.label`)}
              </span>
              <span className="block text-xs text-gray-02">
                {t(`overview.coverage.rematchModes.${option}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}
