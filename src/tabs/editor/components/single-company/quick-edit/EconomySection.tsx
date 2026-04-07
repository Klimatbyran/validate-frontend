import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { inputClassName } from "../../../lib/company-edit-utils";
import type { GarboFieldMetadata, GarboReportingPeriodSummary } from "../../../lib/types";
import type { ReportingPeriodQuickEditEdited } from "../../../lib/reporting-period-quick-edit";
import { MetadataVerifyUndoActions } from "../../MetadataVerifyUndoActions";
import { QuickEditSectionTitle } from "./QuickEditSectionTitle";
import { QuickEditNumberRow } from "./QuickEditNumberRow";

export function EconomySection({
  period,
  edited,
  setEdited,
  setNullableEdit,
}: {
  period: GarboReportingPeriodSummary;
  edited: ReportingPeriodQuickEditEdited;
  setEdited: Dispatch<SetStateAction<ReportingPeriodQuickEditEdited>>;
  setNullableEdit: (
    key: keyof ReportingPeriodQuickEditEdited,
    value: string,
    hadOriginalValue: boolean
  ) => void;
}) {
  const { t } = useI18n();
  const employeeUnitOptions = useMemo(() => ["FTE", "EOY", "AVG"], []);

  const originalTurnover = period.economy?.turnover?.value ?? null;
  const originalTurnoverCurrency = period.economy?.turnover?.currency ?? "SEK";
  const originalTurnoverVerified = !!period.economy?.turnover?.metadata?.verifiedBy;
  const originalEmployees = period.economy?.employees?.value ?? null;
  const originalEmployeesUnit = period.economy?.employees?.unit ?? "FTE";
  const originalEmployeesVerified = !!period.economy?.employees?.metadata?.verifiedBy;

  const turnoverValue = edited.turnoverValue ?? (originalTurnover != null ? String(originalTurnover) : "");
  const turnoverCurrency =
    edited.turnoverCurrency ?? (originalTurnoverCurrency != null ? String(originalTurnoverCurrency) : "SEK");
  const turnoverVerified = edited.turnoverVerified ?? originalTurnoverVerified;

  const employeesValue = edited.employeesValue ?? (originalEmployees != null ? String(originalEmployees) : "");
  const employeesUnit = edited.employeesUnit ?? (originalEmployeesUnit != null ? String(originalEmployeesUnit) : "FTE");
  const employeesVerified = edited.employeesVerified ?? originalEmployeesVerified;

  return (
    <div>
      <QuickEditSectionTitle>{t("editor.reportingPeriodQuickEdit.economySection")}</QuickEditSectionTitle>
      <div className="space-y-4">
        <QuickEditNumberRow
          label={t("editor.periodEditor.turnover")}
          value={turnoverValue}
          onChange={(next) => setNullableEdit("turnoverValue", next, originalTurnover != null)}
          dirty={edited.turnoverValue != null}
          inputClassName={inputClassName}
          fieldLabel={t("editor.periodEditor.turnover")}
          metadata={period.economy?.turnover?.metadata as GarboFieldMetadata | null}
          onReset={() =>
            setEdited((p) => {
              const n = { ...p };
              delete n.turnoverValue;
              delete n.turnoverCurrency;
              delete n.turnoverVerified;
              return n;
            })
          }
          resetTitle={t("editor.reportingPeriodQuickEdit.resetTurnoverTitle")}
          verified={turnoverVerified}
          onToggleVerified={() =>
            setEdited((p) => ({
              ...p,
              turnoverVerified: !turnoverVerified,
            }))
          }
          toggleVerifiedTitle={t("editor.periodEditor.toggleVerifiedTitle")}
          rightSlot={
            <input
              type="text"
              value={turnoverCurrency}
              onChange={(e) =>
                setEdited((p) => ({
                  ...p,
                  turnoverCurrency: e.target.value.toUpperCase(),
                }))
              }
              className={
                inputClassName +
                " bg-gray-04 !w-20 !max-w-none text-center " +
                (edited.turnoverCurrency != null ? " border-orange-03" : "")
              }
              placeholder={t("editor.periodEditor.currencyPlaceholder")}
            />
          }
        />

        <div>
          <div className="mb-1">
            <label className="text-sm font-medium text-gray-01">{t("editor.periodEditor.employees")}</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={employeesValue}
              onChange={(e) => setNullableEdit("employeesValue", e.target.value, originalEmployees != null)}
              className={
                inputClassName +
                " bg-gray-04 w-44 max-w-none " +
                (edited.employeesValue != null ? " border-orange-03" : "")
              }
              step="any"
            />
            <SingleSelectDropdown
              options={employeeUnitOptions}
              value={employeesUnit}
              onChange={(v) => setEdited((p) => ({ ...p, employeesUnit: v }))}
              placeholder={t("editor.periodEditor.employeesUnitPlaceholder")}
              triggerClassName={
                "w-28 justify-between " + (edited.employeesUnit != null ? "border-orange-03" : "")
              }
              panelMinWidth={180}
              getOptionLabel={(v) => {
                if (v === "FTE") return t("editor.periodEditor.unitFteLong");
                if (v === "EOY") return t("editor.periodEditor.unitEoyLong");
                if (v === "AVG") return t("editor.periodEditor.unitAvgLong");
                return v;
              }}
            />
            <MetadataVerifyUndoActions
              fieldLabel={t("editor.periodEditor.employees")}
              metadata={period.economy?.employees?.metadata as GarboFieldMetadata | null}
              verified={employeesVerified}
              onToggleVerified={() =>
                setEdited((p) => ({
                  ...p,
                  employeesVerified: !employeesVerified,
                }))
              }
              verifyTitle={t("editor.periodEditor.toggleVerifiedTitle")}
              verifyAriaLabel={t("editor.periodEditor.toggleVerifiedTitle")}
              onUndo={() =>
                setEdited((p) => {
                  const n = { ...p };
                  delete n.employeesValue;
                  delete n.employeesUnit;
                  delete n.employeesVerified;
                  return n;
                })
              }
              undoTitle={t("editor.reportingPeriodQuickEdit.resetEmployeesTitle")}
              undoAriaLabel={t("editor.reportingPeriodQuickEdit.resetEmployeesTitle")}
              variant="md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

