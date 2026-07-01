import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { BadgeCheck, Undo2 } from "lucide-react";
import { IconActionButton } from "@/ui/icon-action-button";
import { inputClassName } from "../../../lib/company-edit-utils";
import type {
  GarboFieldMetadata,
  GarboReportingPeriodSummary,
} from "../../../lib/types";
import type { ReportingPeriodQuickEditEdited } from "../../../lib/reporting-period-quick-edit";
import { QuickEditSectionTitle } from "./QuickEditSectionTitle";
import { QuickEditNumberRow } from "./QuickEditNumberRow";
import { MetadataDetailsDialog } from "../../MetadataDetailsDialog";
import { Scope3CategoriesSection } from "./Scope3CategoriesSection.tsx";

type NumberRowKey =
  | "scope1"
  | "scope1And2"
  | "scope3StatedTotal"
  | "overallStatedTotal";

type NumberRowSpec = {
  key: NumberRowKey;
  label: string;
  value: string;
  verified: boolean;
  dirty: boolean;
  fieldLabel: string;
  metadata: GarboFieldMetadata | null;
  onChange: (next: string) => void;
  onReset: () => void;
  resetTitle: string;
  onToggleVerified: () => void;
  toggleVerifiedTitle: string;
};

export function EmissionsSection({
  period,
  edited,
  setEdited,
  setNullableEdit,
  showAllScope3Categories,
  setShowAllScope3Categories,
}: {
  period: GarboReportingPeriodSummary;
  edited: ReportingPeriodQuickEditEdited;
  setEdited: Dispatch<SetStateAction<ReportingPeriodQuickEditEdited>>;
  setNullableEdit: (
    key: keyof ReportingPeriodQuickEditEdited,
    value: string,
    hadOriginalValue: boolean,
  ) => void;
  showAllScope3Categories: boolean;
  setShowAllScope3Categories: (next: boolean) => void;
}) {
  const { t } = useI18n();

  const scope12Label = t("editor.companies.scope1And2");

  const originalScope1 = period.emissions?.scope1?.total ?? null;
  const originalScope1Verified =
    !!period.emissions?.scope1?.metadata?.verifiedBy;
  const originalScope1And2 = period.emissions?.scope1And2?.total ?? null;
  const originalScope1And2Verified =
    !!period.emissions?.scope1And2?.metadata?.verifiedBy;
  const originalScope2Mb = period.emissions?.scope2?.mb ?? null;
  const originalScope2Lb = period.emissions?.scope2?.lb ?? null;
  const originalScope2Unknown = period.emissions?.scope2?.unknown ?? null;
  const originalScope2Verified =
    !!period.emissions?.scope2?.metadata?.verifiedBy;
  const originalScope3StatedTotal =
    period.emissions?.scope3?.statedTotalEmissions?.total ?? null;
  const originalScope3StatedTotalVerified =
    !!period.emissions?.scope3?.statedTotalEmissions?.metadata?.verifiedBy;
  const originalStatedTotal =
    period.emissions?.statedTotalEmissions?.total ?? null;
  const originalStatedTotalVerified =
    !!period.emissions?.statedTotalEmissions?.metadata?.verifiedBy;

  const scope1Value =
    edited.scope1Total ??
    (originalScope1 != null ? String(originalScope1) : "");
  const scope1Verified = edited.scope1Verified ?? originalScope1Verified;
  const scope1And2Value =
    edited.scope1And2Total ??
    (originalScope1And2 != null ? String(originalScope1And2) : "");
  const scope1And2Verified =
    edited.scope1And2Verified ?? originalScope1And2Verified;
  const scope2MbValue =
    edited.scope2Mb ??
    (originalScope2Mb != null ? String(originalScope2Mb) : "");
  const scope2LbValue =
    edited.scope2Lb ??
    (originalScope2Lb != null ? String(originalScope2Lb) : "");
  const scope2UnknownValue =
    edited.scope2Unknown ??
    (originalScope2Unknown != null ? String(originalScope2Unknown) : "");
  const scope2Verified = edited.scope2Verified ?? originalScope2Verified;
  const scope3StatedTotalValue =
    edited.scope3StatedTotal ??
    (originalScope3StatedTotal != null
      ? String(originalScope3StatedTotal)
      : "");
  const scope3StatedTotalVerified =
    edited.scope3StatedTotalVerified ?? originalScope3StatedTotalVerified;
  const statedTotalValue =
    edited.statedTotalEmissions ??
    (originalStatedTotal != null ? String(originalStatedTotal) : "");
  const statedTotalVerified =
    edited.statedTotalVerified ?? originalStatedTotalVerified;

  const numberRows: NumberRowSpec[] = [
    {
      key: "scope1",
      label: t("editor.companies.scope1"),
      value: scope1Value,
      verified: scope1Verified,
      dirty: edited.scope1Total != null,
      fieldLabel: t("editor.companies.scope1"),
      metadata: period.emissions?.scope1?.metadata as GarboFieldMetadata | null,
      onChange: (next) =>
        setNullableEdit("scope1Total", next, originalScope1 != null),
      onReset: () =>
        setEdited((p) => {
          const n = { ...p };
          delete n.scope1Total;
          delete n.scope1Verified;
          return n;
        }),
      resetTitle: t("editor.reportingPeriodQuickEdit.resetScope1Title"),
      onToggleVerified: () =>
        setEdited((p) => ({ ...p, scope1Verified: !scope1Verified })),
      toggleVerifiedTitle: t("editor.periodEditor.toggleVerifiedTitle"),
    },
    {
      key: "scope1And2",
      label: scope12Label,
      value: scope1And2Value,
      verified: scope1And2Verified,
      dirty: edited.scope1And2Total != null,
      fieldLabel: scope12Label,
      metadata: period.emissions?.scope1And2
        ?.metadata as GarboFieldMetadata | null,
      onChange: (next) =>
        setNullableEdit("scope1And2Total", next, originalScope1And2 != null),
      onReset: () =>
        setEdited((p) => {
          const n = { ...p };
          delete n.scope1And2Total;
          delete n.scope1And2Verified;
          return n;
        }),
      resetTitle: t("editor.reportingPeriodQuickEdit.resetScope1And2Title"),
      onToggleVerified: () =>
        setEdited((p) => ({ ...p, scope1And2Verified: !scope1And2Verified })),
      toggleVerifiedTitle: t("editor.periodEditor.toggleVerifiedTitle"),
    },
    {
      key: "scope3StatedTotal",
      label: t("editor.reportingPeriodQuickEdit.scope3StatedTotal"),
      value: scope3StatedTotalValue,
      verified: scope3StatedTotalVerified,
      dirty: edited.scope3StatedTotal != null,
      fieldLabel: t("editor.reportingPeriodQuickEdit.scope3StatedTotal"),
      metadata: period.emissions?.scope3?.statedTotalEmissions
        ?.metadata as GarboFieldMetadata | null,
      onChange: (next) =>
        setNullableEdit(
          "scope3StatedTotal",
          next,
          originalScope3StatedTotal != null,
        ),
      onReset: () =>
        setEdited((p) => {
          const n = { ...p };
          delete n.scope3StatedTotal;
          delete n.scope3StatedTotalVerified;
          return n;
        }),
      resetTitle: t("editor.reportingPeriodQuickEdit.resetScope3StatedTitle"),
      onToggleVerified: () =>
        setEdited((p) => ({
          ...p,
          scope3StatedTotalVerified: !scope3StatedTotalVerified,
        })),
      toggleVerifiedTitle: t("editor.periodEditor.toggleVerifiedTitle"),
    },
    {
      key: "overallStatedTotal",
      label: t("editor.reportingPeriodQuickEdit.overallTotal"),
      value: statedTotalValue,
      verified: statedTotalVerified,
      dirty: edited.statedTotalEmissions != null,
      fieldLabel: t("editor.reportingPeriodQuickEdit.overallStatedTotal"),
      metadata: period.emissions?.statedTotalEmissions
        ?.metadata as GarboFieldMetadata | null,
      onChange: (next) =>
        setNullableEdit(
          "statedTotalEmissions",
          next,
          originalStatedTotal != null,
        ),
      onReset: () =>
        setEdited((p) => {
          const n = { ...p };
          delete n.statedTotalEmissions;
          delete n.statedTotalVerified;
          return n;
        }),
      resetTitle: t("editor.reportingPeriodQuickEdit.resetOverallStatedTitle"),
      onToggleVerified: () =>
        setEdited((p) => ({
          ...p,
          statedTotalVerified: !statedTotalVerified,
        })),
      toggleVerifiedTitle: t("editor.periodEditor.toggleVerifiedTitle"),
    },
  ];

  return (
    <div>
      <QuickEditSectionTitle>
        {t("editor.reportingPeriodQuickEdit.emissionsSection")}
      </QuickEditSectionTitle>

      <div className="space-y-3">
        {numberRows.slice(0, 2).map((row) => (
          <QuickEditNumberRow
            key={row.key}
            label={row.label}
            value={row.value}
            onChange={row.onChange}
            dirty={row.dirty}
            inputClassName={inputClassName}
            fieldLabel={row.fieldLabel}
            metadata={row.metadata}
            onReset={row.onReset}
            resetTitle={row.resetTitle}
            verified={row.verified}
            onToggleVerified={row.onToggleVerified}
            toggleVerifiedTitle={row.toggleVerifiedTitle}
          />
        ))}

        {/* Scope 2 card (kept as-is but moved here) */}
        <div className="rounded-lg bg-gray-04 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-01">
              {t("editor.companies.scope2")}
            </div>
            <div className="flex items-center gap-1">
              <MetadataDetailsDialog
                fieldLabel={t("editor.companies.scope2")}
                metadata={
                  period.emissions?.scope2
                    ?.metadata as GarboFieldMetadata | null
                }
              />
              <IconActionButton
                variant="md"
                onClick={() =>
                  setEdited((p) => {
                    const n = { ...p };
                    delete n.scope2Mb;
                    delete n.scope2Lb;
                    delete n.scope2Unknown;
                    delete n.scope2Verified;
                    return n;
                  })
                }
                title={t("editor.reportingPeriodQuickEdit.resetScope2Title")}
                aria-label={t(
                  "editor.reportingPeriodQuickEdit.resetScope2Title",
                )}
              >
                <Undo2 className="text-gray-02" />
              </IconActionButton>
              <IconActionButton
                variant="md"
                onClick={() =>
                  setEdited((p) => ({ ...p, scope2Verified: !scope2Verified }))
                }
                title={t("editor.periodEditor.toggleVerifiedScope2Title")}
                aria-label={t("editor.periodEditor.toggleVerifiedScope2Title")}
              >
                <BadgeCheck
                  className={scope2Verified ? "text-green-03" : "text-gray-02"}
                />
              </IconActionButton>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-02 mb-1">
                {t("editor.periodEditor.scope2Mb")}
              </div>
              <input
                type="number"
                value={scope2MbValue}
                onChange={(e) =>
                  setNullableEdit(
                    "scope2Mb",
                    e.target.value,
                    originalScope2Mb != null,
                  )
                }
                className={
                  inputClassName +
                  " bg-gray-04 w-full max-w-none " +
                  (edited.scope2Mb != null ? " border-orange-03" : "")
                }
              />
            </div>
            <div>
              <div className="text-xs text-gray-02 mb-1">
                {t("editor.periodEditor.scope2Lb")}
              </div>
              <input
                type="number"
                value={scope2LbValue}
                onChange={(e) =>
                  setNullableEdit(
                    "scope2Lb",
                    e.target.value,
                    originalScope2Lb != null,
                  )
                }
                className={
                  inputClassName +
                  " bg-gray-04 w-full max-w-none " +
                  (edited.scope2Lb != null ? " border-orange-03" : "")
                }
              />
            </div>
            <div>
              <div className="text-xs text-gray-02 mb-1">
                {t("editor.periodEditor.scope2Unknown")}
              </div>
              <input
                type="number"
                value={scope2UnknownValue}
                onChange={(e) =>
                  setNullableEdit(
                    "scope2Unknown",
                    e.target.value,
                    originalScope2Unknown != null,
                  )
                }
                className={
                  inputClassName +
                  " bg-gray-04 w-full max-w-none " +
                  (edited.scope2Unknown != null ? " border-orange-03" : "")
                }
              />
            </div>
          </div>
        </div>

        <QuickEditNumberRow
          label={numberRows[2]!.label}
          value={numberRows[2]!.value}
          onChange={numberRows[2]!.onChange}
          dirty={numberRows[2]!.dirty}
          inputClassName={inputClassName}
          fieldLabel={numberRows[2]!.fieldLabel}
          metadata={numberRows[2]!.metadata}
          onReset={numberRows[2]!.onReset}
          resetTitle={numberRows[2]!.resetTitle}
          verified={numberRows[2]!.verified}
          onToggleVerified={numberRows[2]!.onToggleVerified}
          toggleVerifiedTitle={numberRows[2]!.toggleVerifiedTitle}
        />

        <Scope3CategoriesSection
          period={period}
          edited={edited}
          setEdited={setEdited}
          showAllScope3Categories={showAllScope3Categories}
          setShowAllScope3Categories={setShowAllScope3Categories}
        />

        <QuickEditNumberRow
          label={numberRows[3]!.label}
          value={numberRows[3]!.value}
          onChange={numberRows[3]!.onChange}
          dirty={numberRows[3]!.dirty}
          inputClassName={inputClassName}
          fieldLabel={numberRows[3]!.fieldLabel}
          metadata={numberRows[3]!.metadata}
          onReset={numberRows[3]!.onReset}
          resetTitle={numberRows[3]!.resetTitle}
          verified={numberRows[3]!.verified}
          onToggleVerified={numberRows[3]!.onToggleVerified}
          toggleVerifiedTitle={numberRows[3]!.toggleVerifiedTitle}
        />
      </div>
    </div>
  );
}
