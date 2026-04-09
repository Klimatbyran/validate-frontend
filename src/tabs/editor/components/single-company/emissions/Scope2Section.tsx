import { useI18n } from "@/contexts/I18nContext";
import type { GarboFieldMetadata, GarboReportingPeriodSummary } from "../../../lib/types";
import type { EditedPeriodEmissions } from "../../../lib/emissions-edit";
import { EmissionsEditRow, Scope2BottomBracket, Scope2TopBracket, emissionsFieldCellClass } from "./EmissionsGridParts";
import { MetadataVerifyUndoActions } from "../../MetadataVerifyUndoActions";

type PeriodColumn = { rp: GarboReportingPeriodSummary & { id: string }; year: string };

export function Scope2Section({
  visibleColumns,
  edited,
  setNullableStringEdit,
  setEditedField,
  clearEditedKeys,
  numInputClass,
}: {
  visibleColumns: PeriodColumn[];
  edited: Record<string, EditedPeriodEmissions>;
  setNullableStringEdit: (
    rpId: string,
    key: keyof EditedPeriodEmissions,
    value: string,
    hadOriginalValue: boolean
  ) => void;
  setEditedField: (rpId: string, patch: Partial<EditedPeriodEmissions>) => void;
  clearEditedKeys: (rpId: string, keys: Array<keyof EditedPeriodEmissions>) => void;
  numInputClass: string;
}) {
  const { t } = useI18n();
  const scope2 = t("editor.companies.scope2");
  const markVerified = t("editor.fieldEdit.markVerified");
  const undoScope2 = t("editor.periodEditor.undoField", { field: scope2 });
  const scope2FieldLabel = (year: string) => `${scope2} (${year})`;

  return (
    <>
      <EmissionsEditRow
        name={
          <span>
            <span className="block">{scope2}</span>
            <span className="block text-xs font-normal text-gray-02 mt-1 font-sans">
              {t("editor.periodEditor.scope2VerifiedHint")}
            </span>
          </span>
        }
        headerName
        noHover
      >
        {visibleColumns.map(({ rp, year }) => {
          const rpEdits = edited[rp.id] ?? {};
          const originalMeta = rp.emissions?.scope2?.metadata as GarboFieldMetadata | null;
          const originalVerified = !!originalMeta?.verifiedBy;
          const verified = rpEdits.scope2Verified ?? originalVerified;
          const dirty =
            rpEdits.scope2Mb != null || rpEdits.scope2Lb != null || rpEdits.scope2Unknown != null;
          const dirtyVerified = rpEdits.scope2Verified != null;
          const undoDisabled = !(dirty || dirtyVerified);

          return (
            <div key={rp.id} className={emissionsFieldCellClass}>
              <MetadataVerifyUndoActions
                fieldLabel={scope2FieldLabel(year)}
                metadata={originalMeta}
                verified={verified}
                onToggleVerified={() => setEditedField(rp.id, { scope2Verified: !verified })}
                verifyTitle={markVerified}
                verifyAriaLabel={markVerified}
                onUndo={() =>
                  clearEditedKeys(rp.id, ["scope2Mb", "scope2Lb", "scope2Unknown", "scope2Verified"])
                }
                undoDisabled={undoDisabled}
                undoTitle={undoScope2}
                undoAriaLabel={undoScope2}
              />
            </div>
          );
        })}
      </EmissionsEditRow>

      <EmissionsEditRow
        name={<span className="ps-2 font-medium">{t("editor.periodEditor.scope2Mb")}</span>}
      >
        {visibleColumns.map(({ rp }) => {
          const rpEdits = edited[rp.id] ?? {};
          const original = rp.emissions?.scope2?.mb ?? null;
          const value = rpEdits.scope2Mb ?? (original != null ? String(original) : "");
          const dirty =
            rpEdits.scope2Mb != null || rpEdits.scope2Lb != null || rpEdits.scope2Unknown != null;
          return (
            <div key={rp.id} className={emissionsFieldCellClass}>
              <input
                type="number"
                value={value}
                onChange={(e) => setNullableStringEdit(rp.id, "scope2Mb", e.target.value, original != null)}
                className={
                  numInputClass + " placeholder:text-gray-02/70" + (dirty ? " border-orange-03" : "")
                }
                step="any"
              />
              <Scope2TopBracket />
            </div>
          );
        })}
      </EmissionsEditRow>

      <EmissionsEditRow
        name={<span className="ps-2 font-medium">{t("editor.periodEditor.scope2Lb")}</span>}
      >
        {visibleColumns.map(({ rp }) => {
          const rpEdits = edited[rp.id] ?? {};
          const original = rp.emissions?.scope2?.lb ?? null;
          const value = rpEdits.scope2Lb ?? (original != null ? String(original) : "");
          const dirty =
            rpEdits.scope2Mb != null || rpEdits.scope2Lb != null || rpEdits.scope2Unknown != null;
          return (
            <div key={rp.id} className={emissionsFieldCellClass}>
              <input
                type="number"
                value={value}
                onChange={(e) => setNullableStringEdit(rp.id, "scope2Lb", e.target.value, original != null)}
                className={
                  numInputClass + " placeholder:text-gray-02/70" + (dirty ? " border-orange-03" : "")
                }
                step="any"
              />
            </div>
          );
        })}
      </EmissionsEditRow>

      <EmissionsEditRow
        name={<span className="ps-2 font-medium">{t("editor.periodEditor.scope2Unknown")}</span>}
      >
        {visibleColumns.map(({ rp }) => {
          const rpEdits = edited[rp.id] ?? {};
          const original = rp.emissions?.scope2?.unknown ?? null;
          const value = rpEdits.scope2Unknown ?? (original != null ? String(original) : "");
          const dirty =
            rpEdits.scope2Mb != null || rpEdits.scope2Lb != null || rpEdits.scope2Unknown != null;
          return (
            <div key={rp.id} className={emissionsFieldCellClass}>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setNullableStringEdit(rp.id, "scope2Unknown", e.target.value, original != null)
                }
                className={
                  numInputClass + " placeholder:text-gray-02/70" + (dirty ? " border-orange-03" : "")
                }
                step="any"
              />
              <Scope2BottomBracket />
            </div>
          );
        })}
      </EmissionsEditRow>
    </>
  );
}

