import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { namesFromTextarea } from "@/tabs/overview/lib/coverage-api";
import type { CoverageListGroup } from "@/tabs/overview/lib/coverage-types";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

export type CoverageYearFormMode =
  | "createList"
  | "addYear"
  | "editYear"
  | "editList";

type CoverageYearFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CoverageYearFormMode;
  groups?: CoverageListGroup[];
  initialListName?: string;
  initialGroupId?: string | null;
  initialYear?: number;
  initialNamesText?: string;
  onSubmit: (input: {
    listName?: string;
    groupId?: string | null;
    year: number;
    names: string[];
  }) => Promise<void>;
  isSubmitting?: boolean;
};

export function CoverageYearFormDialog({
  open,
  onOpenChange,
  mode,
  groups = [],
  initialListName = "",
  initialGroupId = null,
  initialYear = new Date().getFullYear(),
  initialNamesText = "",
  onSubmit,
  isSubmitting = false,
}: CoverageYearFormDialogProps) {
  const { t } = useI18n();
  const [listName, setListName] = useState(initialListName);
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? "");
  const [year, setYear] = useState(String(initialYear));
  const [namesText, setNamesText] = useState(initialNamesText);

  useEffect(() => {
    if (!open) return;
    setListName(initialListName);
    setGroupId(initialGroupId ?? "");
    setYear(String(initialYear));
    setNamesText(initialNamesText);
  }, [open, initialListName, initialGroupId, initialYear, initialNamesText]);

  const title =
    mode === "createList"
      ? t("overview.coverage.createListTitle")
      : mode === "addYear"
        ? t("overview.coverage.addYearTitle")
        : mode === "editList"
          ? t("overview.coverage.editListTitle")
          : t("overview.coverage.editYearTitle");

  const trimmedListName = listName.trim();
  const parsedYear = Number.parseInt(year, 10);
  const isValidYear = Number.isFinite(parsedYear);
  const canSubmit =
    mode === "editList"
      ? trimmedListName.length > 0
      : mode === "createList"
        ? trimmedListName.length > 0 && isValidYear
        : isValidYear;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      listName:
        mode === "createList" || mode === "editList"
          ? trimmedListName
          : undefined,
      groupId:
        mode === "createList" || mode === "editList"
          ? groupId || null
          : undefined,
      year: parsedYear,
      names: namesFromTextarea(namesText),
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size={mode === "editList" ? "lg" : "3xl"}
      scrollable={mode !== "editList"}
      title={title}
      description={
        mode === "editList"
          ? t("overview.coverage.editListHint")
          : t("overview.coverage.formHint")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || isSubmitting}
          >
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {mode === "createList" || mode === "editList" ? (
          <>
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
            <label className="block space-y-1">
              <span className="text-sm text-gray-02">
                {t("overview.coverage.groupLabel")}
              </span>
              <select
                className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">
                  {t("overview.coverage.groupNone")}
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {mode !== "editList" ? (
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

        {mode !== "editList" ? (
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
        ) : null}
      </div>
    </Modal>
  );
}
