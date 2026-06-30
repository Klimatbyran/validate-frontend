import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { namesFromTextarea } from "@/tabs/overview/lib/coverage-api";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

type CoverageYearFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "createList" | "addYear" | "editYear";
  initialListName?: string;
  initialYear?: number;
  initialNamesText?: string;
  onSubmit: (input: {
    listName?: string;
    year: number;
    names: string[];
  }) => Promise<void>;
  isSubmitting?: boolean;
};

export function CoverageYearFormDialog({
  open,
  onOpenChange,
  mode,
  initialListName = "",
  initialYear = new Date().getFullYear(),
  initialNamesText = "",
  onSubmit,
  isSubmitting = false,
}: CoverageYearFormDialogProps) {
  const { t } = useI18n();
  const [listName, setListName] = useState(initialListName);
  const [year, setYear] = useState(String(initialYear));
  const [namesText, setNamesText] = useState(initialNamesText);

  useEffect(() => {
    if (!open) return;
    setListName(initialListName);
    setYear(String(initialYear));
    setNamesText(initialNamesText);
  }, [open, initialListName, initialYear, initialNamesText]);

  const title =
    mode === "createList"
      ? t("overview.coverage.createListTitle")
      : mode === "addYear"
        ? t("overview.coverage.addYearTitle")
        : t("overview.coverage.editYearTitle");

  const handleSubmit = async () => {
    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear)) return;
    await onSubmit({
      listName: mode === "createList" ? listName.trim() : undefined,
      year: parsedYear,
      names: namesFromTextarea(namesText),
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="3xl"
      scrollable
      title={title}
      description={t("overview.coverage.formHint")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {mode === "createList" ? (
          <label className="block space-y-1">
            <span className="text-sm text-gray-02">
              {t("overview.coverage.listNameLabel")}
            </span>
            <input
              className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={t("overview.coverage.listNamePlaceholder")}
            />
          </label>
        ) : null}

        {mode !== "editYear" ? (
          <label className="block space-y-1">
            <span className="text-sm text-gray-02">
              {t("overview.coverage.yearLabel")}
            </span>
            <input
              type="number"
              className="w-full max-w-[10rem] rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={1900}
              max={2100}
            />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm text-gray-02">
            {t("overview.coverage.namesLabel")}
          </span>
          <textarea
            className="w-full min-h-[320px] rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm font-mono"
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            placeholder={t("overview.coverage.namesPlaceholder")}
          />
          <p className="text-xs text-gray-02">
            {t("overview.coverage.namesCount", {
              count: namesFromTextarea(namesText).length,
            })}
          </p>
        </label>
      </div>
    </Modal>
  );
}
