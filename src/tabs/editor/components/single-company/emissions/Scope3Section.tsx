import { BadgeCheck, Undo2 } from "lucide-react";
import { IconActionButton } from "@/ui/icon-action-button";
import { useI18n } from "@/contexts/I18nContext";
import type { GarboFieldMetadata, GarboReportingPeriodSummary } from "../../../lib/types";
import type { EditedPeriodEmissions } from "../../../lib/emissions-edit";
import { MetadataDetailsDialog } from "../../MetadataDetailsDialog";
import { EmissionsNumberCell } from "./EmissionsNumberCell";
import { EmissionsEditRow, emissionsFieldCellClass, emissionsPeriodEmptyCellClass } from "./EmissionsGridParts";

type PeriodColumn = { rp: GarboReportingPeriodSummary & { id: string }; year: string };

export function Scope3Section({
  visibleColumns,
  edited,
  scope3CategoryIds,
  setNullableStringEdit,
  setEditedField,
  clearEditedKeys,
  setScope3CategoryValue,
  setScope3CategoryVerified,
  clearScope3Category,
  numInputClass,
}: {
  visibleColumns: PeriodColumn[];
  edited: Record<string, EditedPeriodEmissions>;
  scope3CategoryIds: number[];
  setNullableStringEdit: (
    rpId: string,
    key: keyof EditedPeriodEmissions,
    value: string,
    hadOriginalValue: boolean
  ) => void;
  setEditedField: (rpId: string, patch: Partial<EditedPeriodEmissions>) => void;
  clearEditedKeys: (rpId: string, keys: Array<keyof EditedPeriodEmissions>) => void;
  setScope3CategoryValue: (
    rpId: string,
    category: number,
    value: string,
    hadOriginalValue: boolean
  ) => void;
  setScope3CategoryVerified: (rpId: string, category: number, verified: boolean) => void;
  clearScope3Category: (rpId: string, category: number) => void;
  numInputClass: string;
}) {
  const { t } = useI18n();
  const markVerified = t("editor.fieldEdit.markVerified");
  const undoField = (field: string) => t("editor.periodEditor.undoField", { field });

  function scope3CategoryRowLabel(categoryId: number): string {
    const key = `editor.companies.scope3Categories.${categoryId}`;
    const name = t(key);
    const missing = !name || name === key;
    const title = missing ? t("editor.periodEditor.categoryUnknown", { n: categoryId }) : name;
    return `${categoryId}. ${title}`;
  }

  return (
    <>
      <EmissionsEditRow name={t("editor.periodEditor.scope3Section")} headerName noHover>
        {visibleColumns.map(({ rp }) => (
          <div key={rp.id} className={emissionsPeriodEmptyCellClass} />
        ))}
      </EmissionsEditRow>

      <EmissionsEditRow name={<span className="ps-2">{t("editor.periodEditor.statedTotal")}</span>}>
        {visibleColumns.map(({ rp, year }) => {
          const rpEdits = edited[rp.id] ?? {};
          const original = rp.emissions?.scope3?.statedTotalEmissions?.total ?? null;
          const originalVerified = !!rp.emissions?.scope3?.statedTotalEmissions?.metadata?.verifiedBy;
          const value =
            rpEdits.scope3StatedTotalEmissions ?? (original != null ? String(original) : "");
          const dirty = rpEdits.scope3StatedTotalEmissions != null;
          const dirtyVerified = rpEdits.scope3StatedTotalVerified != null;
          const verified = rpEdits.scope3StatedTotalVerified ?? originalVerified;
          const undoDisabled = !(dirty || dirtyVerified);

          return (
            <div key={rp.id} className={emissionsFieldCellClass}>
              <EmissionsNumberCell
                value={value}
                dirty={dirty}
                onChange={(next) =>
                  setNullableStringEdit(rp.id, "scope3StatedTotalEmissions", next, original != null)
                }
                metadata={
                  rp.emissions?.scope3?.statedTotalEmissions?.metadata as GarboFieldMetadata | null
                }
                fieldLabel={t("editor.periodEditor.scope3StatedTotalShort", { year: year || "" })}
                verified={verified}
                onToggleVerified={() =>
                  setEditedField(rp.id, { scope3StatedTotalVerified: !verified })
                }
                onUndo={() =>
                  clearEditedKeys(rp.id, ["scope3StatedTotalEmissions", "scope3StatedTotalVerified"])
                }
                undoDisabled={undoDisabled}
                verifyTitle={markVerified}
                verifyAriaLabel={markVerified}
                undoTitle={t("editor.periodEditor.undoScope3StatedTotal")}
                undoAriaLabel={t("editor.periodEditor.undoScope3StatedTotal")}
                inputClassName={numInputClass}
              />
            </div>
          );
        })}
      </EmissionsEditRow>

      {scope3CategoryIds.map((category) => (
        <EmissionsEditRow
          key={category}
          name={<span className="ps-2 leading-snug">{scope3CategoryRowLabel(category)}</span>}
        >
          {visibleColumns.map(({ rp, year }) => {
            const rpEdits = edited[rp.id] ?? {};
            const originalCat = rp.emissions?.scope3?.categories?.find((c) => c.category === category);
            const originalVal = originalCat?.total ?? null;
            const originalVerified = !!originalCat?.metadata?.verifiedBy;

            const editedVal = rpEdits.scope3Categories?.[String(category)];
            const value = editedVal ?? (originalVal != null ? String(originalVal) : "");
            const dirty = editedVal != null;

            const hasEditedVerified =
              rpEdits.scope3CategoriesVerified != null &&
              Object.prototype.hasOwnProperty.call(rpEdits.scope3CategoriesVerified, String(category));
            const editedVerified = rpEdits.scope3CategoriesVerified?.[String(category)];
            const verified = hasEditedVerified ? !!editedVerified : originalVerified;

            const undoDisabled = !(dirty || hasEditedVerified);
            const rowLabel = scope3CategoryRowLabel(category);

            return (
              <div key={rp.id} className={emissionsFieldCellClass}>
                <input
                  type="number"
                  value={value}
                  onChange={(e) =>
                    setScope3CategoryValue(rp.id, category, e.target.value, originalVal != null)
                  }
                  className={
                    numInputClass + " placeholder:text-gray-02/70" + (dirty ? " border-orange-03" : "")
                  }
                  step="any"
                />
                <MetadataDetailsDialog
                  fieldLabel={`${rowLabel} (${year || ""})`}
                  metadata={originalCat?.metadata as GarboFieldMetadata | null}
                />
                <IconActionButton
                  onClick={() => setScope3CategoryVerified(rp.id, category, !verified)}
                  aria-label={markVerified}
                  title={markVerified}
                >
                  <BadgeCheck className={verified ? "text-green-03" : "text-gray-02"} />
                </IconActionButton>
                <IconActionButton
                  disabled={undoDisabled}
                  onClick={() => clearScope3Category(rp.id, category)}
                  aria-label={undoField(rowLabel)}
                  title={undoField(rowLabel)}
                >
                  <Undo2 className="text-gray-02" />
                </IconActionButton>
              </div>
            );
          })}
        </EmissionsEditRow>
      ))}
    </>
  );
}

