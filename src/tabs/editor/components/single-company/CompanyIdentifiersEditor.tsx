import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { upsertCompanyIdentifier } from "../../lib/companies-api";
import {
  WIKIDATA_ID_REGEX,
  type GarboCompanyDetail,
  type GarboCompanyIdentifierType,
} from "../../lib/types";
import { inputClassName } from "../../lib/company-edit-utils";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import {
  availableIdentifierTypesToAdd,
  buildEditableIdentifiers,
  type EditableCompanyIdentifier,
} from "../../lib/company-identifiers";
import { MetadataVerifyUndoActions } from "../MetadataVerifyUndoActions";
import { ReviewerMetadataDialog } from "../ReviewerMetadataDialog";
import { CompanyIdentifierVerificationBadge } from "./CompanyIdentifierVerificationBadge";

const IDENTIFIER_TYPE_KEYS = {
  WIKIDATA: "wikidata",
  LEI: "lei",
  ORG_NUMBER: "orgNumber",
  ISIN: "isin",
} as const satisfies Record<GarboCompanyIdentifierType, string>;

function identifierTypeLabel(
  t: (key: string) => string,
  type: GarboCompanyIdentifierType,
): string {
  return t(`editor.companyDetail.identifierType.${IDENTIFIER_TYPE_KEYS[type]}`);
}

function validateIdentifierValue(
  type: GarboCompanyIdentifierType,
  value: string,
  t: (key: string) => string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return t("editor.companyDetail.identifierValueRequired");
  }
  if (type === "WIKIDATA" && !WIKIDATA_ID_REGEX.test(trimmed)) {
    return t("wikidata.invalidFormat");
  }
  return null;
}

export function CompanyIdentifiersEditor({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState(() => buildEditableIdentifiers(company));
  const [addType, setAddType] = useState<GarboCompanyIdentifierType | "">("");
  const [addValue, setAddValue] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<EditableCompanyIdentifier | null>(
    null,
  );

  useEffect(() => {
    setRows(buildEditableIdentifiers(company));
    setAddType("");
    setAddValue("");
  }, [company.id, company.identifiers, company.wikidataId, company.lei]);

  const typesInUse = useMemo(
    () => rows.map((row) => row.type),
    [rows],
  );
  const typesAvailableToAdd = useMemo(
    () => availableIdentifierTypesToAdd(typesInUse),
    [typesInUse],
  );

  useEffect(() => {
    if (addType && !typesAvailableToAdd.includes(addType)) {
      setAddType(typesAvailableToAdd[0] ?? "");
    } else if (!addType && typesAvailableToAdd.length > 0) {
      setAddType(typesAvailableToAdd[0]!);
    }
  }, [addType, typesAvailableToAdd]);

  const updateRow = (
    key: string,
    patch: Partial<EditableCompanyIdentifier>,
  ) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleAddRow = () => {
    if (!addType) return;
    const validationError = validateIdentifierValue(addType, addValue, t);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (rows.some((row) => row.type === addType)) {
      toast.error(t("editor.companyDetail.identifierTypeAlreadyExists"));
      return;
    }

    const trimmed = addValue.trim();
    const newRow: EditableCompanyIdentifier = {
      key: `new-${addType}`,
      type: addType,
      value: trimmed,
      originalValue: "",
      verified: true,
      originalVerified: false,
      metadata: null,
      isNew: true,
    };
    setRows((current) => [...current, newRow]);
    setAddValue("");
    setPendingSave(newRow);
  };

  const handleSave = async (
    row: EditableCompanyIdentifier,
    meta?: { comment?: string; source?: string },
  ) => {
    const validationError = validateIdentifierValue(row.type, row.value, t);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSavingKey(row.key);
    try {
      await upsertCompanyIdentifier(company.id, {
        type: row.type,
        value: row.value.trim(),
        verified: row.verified,
        metadata:
          meta?.comment?.trim() || meta?.source?.trim()
            ? {
                comment: meta.comment?.trim() || undefined,
                source: meta.source?.trim() || undefined,
              }
            : undefined,
      });
      toast.success(t("editor.companyDetail.identifierSaved"));
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="rounded-lg bg-gray-05/60 p-4">
      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-3">
        {t("editor.companyDetail.identifiers")}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-01 mb-1">
          {t("editor.companyDetail.internalId")}
        </label>
        <input
          type="text"
          value={company.id}
          readOnly
          className={inputClassName + " bg-gray-04/60 !max-w-none"}
        />
      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const dirty =
            row.isNew ||
            row.value.trim() !== row.originalValue.trim() ||
            row.verified !== row.originalVerified;
          const isSaving = savingKey === row.key;

          return (
            <li
              key={row.key}
              className="rounded-md bg-gray-05/80 px-3 py-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
                  {identifierTypeLabel(t, row.type)}
                </div>
                <CompanyIdentifierVerificationBadge
                  identifier={{
                    id: row.key,
                    type: row.type,
                    value: row.value,
                    metadata: row.verified
                      ? {
                          verifiedBy: {
                            name:
                              row.metadata?.verifiedBy?.name?.trim() ||
                              t("editor.companyDetail.verified"),
                          },
                        }
                      : { verifiedBy: null },
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) =>
                    updateRow(row.key, { value: e.target.value })
                  }
                  placeholder={
                    row.type === "WIKIDATA"
                      ? t("wikidata.placeholder")
                      : undefined
                  }
                  className={
                    inputClassName +
                    " !max-w-none flex-1 min-w-[12rem] " +
                    (dirty ? "border-orange-03" : "")
                  }
                />
                <MetadataVerifyUndoActions
                  fieldLabel={identifierTypeLabel(t, row.type)}
                  metadata={row.metadata ?? null}
                  verified={row.verified}
                  onToggleVerified={() =>
                    updateRow(row.key, { verified: !row.verified })
                  }
                  verifyTitle={t("editor.periodEditor.toggleVerifiedTitle")}
                  verifyAriaLabel={t("editor.periodEditor.toggleVerifiedTitle")}
                  onUndo={() =>
                    updateRow(row.key, {
                      value: row.originalValue,
                      verified: row.originalVerified,
                    })
                  }
                  undoTitle={t("editor.singleCompanyView.undo")}
                  undoAriaLabel={t("editor.singleCompanyView.undo")}
                  undoDisabled={row.isNew}
                  variant="sm"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!dirty || isSaving}
                  onClick={() => setPendingSave(row)}
                  className={editorPrimaryActionButtonClass}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {t("editor.fieldEdit.save")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {typesAvailableToAdd.length > 0 && (
        <div className="mt-4 rounded-md border border-dashed border-gray-03/80 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-02">
            {t("editor.companyDetail.addIdentifier")}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[9rem]">
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("editor.companyDetail.identifierTypeLabel")}
              </label>
              <SingleSelectDropdown
                options={typesAvailableToAdd}
                value={addType}
                onChange={(value) =>
                  setAddType(value as GarboCompanyIdentifierType | "")
                }
                placeholder={t("editor.companyDetail.selectIdentifierType")}
                getOptionLabel={(value) =>
                  identifierTypeLabel(t, value as GarboCompanyIdentifierType)
                }
                usePortal={false}
                triggerClassName="!h-8 !text-xs px-3 w-full"
              />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("editor.companyDetail.identifierValueLabel")}
              </label>
              <input
                type="text"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder={t("editor.companyDetail.identifierValuePlaceholder")}
                className={inputClassName + " !max-w-none !h-8 !text-xs"}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddRow}
              disabled={!addType || !addValue.trim()}
              className="!h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("editor.companyDetail.addIdentifier")}
            </Button>
          </div>
        </div>
      )}

      <ReviewerMetadataDialog
        open={pendingSave != null}
        onOpenChange={(open) => {
          if (!open) setPendingSave(null);
        }}
        title={t("editor.reviewerDialog.title")}
        confirmLabel={t("editor.fieldEdit.save")}
        saving={savingKey != null}
        onConfirm={async (meta) => {
          const row = pendingSave;
          setPendingSave(null);
          if (!row) return;
          const current =
            rows.find((candidate) => candidate.key === row.key) ?? row;
          await handleSave(current, meta);
        }}
      />
    </section>
  );
}
