import { useI18n } from "@/contexts/I18nContext";

// The TEF framework's six Activity Shift categories (Table 7) -- exact
// strings matter here, matching ENUM_TO_SHIFT_TYPE's values in
// matchTransitionElements.ts, which downstream matching code compares
// against directly. Only relevant when creating a brand-new element --
// editing an existing one always carries its category over unchanged,
// since PATCH never lets you change it.
export const ACTIVITY_SHIFT_CATEGORIES = [
  "Type Shift",
  "Resource Shift",
  "Utilisation Shift",
  "Work Efficiency Shift",
  "Resource Efficiency Shift",
  "Carbon Shift",
] as const;

/** Shared editable-field set for a real TransitionElement — used by both
 * TaxonomyTab's own edit panel and the shadow-taxonomy "broaden this" /
 * "add as new real element instead" flow, so both render the identical
 * form instead of maintaining two copies. Array fields stay as plain
 * comma-joined text while editing — splitting/joining only at the edges
 * (load + save) is far less fiddly than a dedicated chip editor for what's
 * a rare, deliberate edit, not a high-frequency interaction. */
export interface TransitionElementFormDraft {
  shortLabel: string;
  description: string;
  sectorId: string;
  sectorPath: string;
  actsOnLabels: string;
  shiftsToLabels: string;
  coBenefits: string;
  sustainabilityClass: string;
}

export function toFormDraft(fields: {
  shortLabel: string;
  description: string;
  sectorId: string | null;
  sectorPath: string;
  actsOnLabels: string[];
  shiftsToLabels: string[];
  coBenefits: string[];
  sustainabilityClass: string | null;
}): TransitionElementFormDraft {
  return {
    shortLabel: fields.shortLabel,
    description: fields.description,
    sectorId: fields.sectorId ?? "",
    sectorPath: fields.sectorPath,
    actsOnLabels: fields.actsOnLabels.join(", "),
    shiftsToLabels: fields.shiftsToLabels.join(", "),
    coBenefits: fields.coBenefits.join(", "),
    sustainabilityClass: fields.sustainabilityClass ?? "",
  };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The subset of a draft that both updateTransitionElement (PATCH) and
 * createTransitionElement (POST) share — a create call adds
 * activityShiftCategory/editedBy on top of this itself, since those aren't
 * part of this shared form. */
export function formDraftToFields(draft: TransitionElementFormDraft) {
  return {
    shortLabel: draft.shortLabel,
    description: draft.description,
    sectorId: draft.sectorId.trim() || null,
    sectorPath: draft.sectorPath,
    actsOnLabels: splitList(draft.actsOnLabels),
    shiftsToLabels: splitList(draft.shiftsToLabels),
    coBenefits: splitList(draft.coBenefits),
    sustainabilityClass: draft.sustainabilityClass.trim() || null,
  };
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-02">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-blue-03 bg-gray-04/40 px-2.5 py-2 text-sm text-gray-01 resize-none focus:outline-none"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full h-9 rounded-md border border-blue-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none"
        />
      )}
    </label>
  );
}

export function TransitionElementEditForm({
  draft,
  onChange,
}: {
  draft: TransitionElementFormDraft;
  onChange: (next: TransitionElementFormDraft) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Field
        label={t("taxonomy.fieldShortLabel")}
        value={draft.shortLabel}
        onChange={(v) => onChange({ ...draft, shortLabel: v })}
      />
      <Field
        label={t("taxonomy.fieldDescription")}
        value={draft.description}
        onChange={(v) => onChange({ ...draft, description: v })}
        multiline
      />
      <Field
        label={t("taxonomy.fieldSectorPath")}
        value={draft.sectorPath}
        onChange={(v) => onChange({ ...draft, sectorPath: v })}
      />
      <Field
        label={t("taxonomy.fieldSectorId")}
        value={draft.sectorId}
        onChange={(v) => onChange({ ...draft, sectorId: v })}
      />
      <Field
        label={t("taxonomy.fieldActsOn")}
        value={draft.actsOnLabels}
        placeholder={t("taxonomy.commaSeparated")}
        onChange={(v) => onChange({ ...draft, actsOnLabels: v })}
      />
      <Field
        label={t("taxonomy.fieldShiftsTo")}
        value={draft.shiftsToLabels}
        placeholder={t("taxonomy.commaSeparated")}
        onChange={(v) => onChange({ ...draft, shiftsToLabels: v })}
      />
      <Field
        label={t("taxonomy.fieldCoBenefits")}
        value={draft.coBenefits}
        placeholder={t("taxonomy.commaSeparated")}
        onChange={(v) => onChange({ ...draft, coBenefits: v })}
      />
      <Field
        label={t("taxonomy.fieldSustainabilityClass")}
        value={draft.sustainabilityClass}
        onChange={(v) => onChange({ ...draft, sustainabilityClass: v })}
      />
    </>
  );
}
