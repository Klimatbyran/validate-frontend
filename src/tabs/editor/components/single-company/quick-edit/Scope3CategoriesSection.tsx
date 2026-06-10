import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { inputClassName } from "../../../lib/company-edit-utils";
import type {
  GarboFieldMetadata,
  GarboReportingPeriodSummary,
} from "../../../lib/types";
import {
  quickEditScope3CategoryName,
  scope3CategoryIdsForDisplay,
  type ReportingPeriodQuickEditEdited,
} from "../../../lib/reporting-period-quick-edit";
import { Scope3CategoriesCard } from "./Scope3CategoriesCard";

export function Scope3CategoriesSection({
  period,
  edited,
  setEdited,
  showAllScope3Categories,
  setShowAllScope3Categories,
}: {
  period: GarboReportingPeriodSummary;
  edited: ReportingPeriodQuickEditEdited;
  setEdited: Dispatch<SetStateAction<ReportingPeriodQuickEditEdited>>;
  showAllScope3Categories: boolean;
  setShowAllScope3Categories: (next: boolean) => void;
}) {
  const { t } = useI18n();

  const scope3Categories = period.emissions?.scope3?.categories ?? [];
  const categoryIds = useMemo(
    () =>
      Array.from(new Set(scope3Categories.map((c) => c.category))).sort(
        (a, b) => a - b,
      ),
    [scope3Categories],
  );

  const displayScope3CategoryIds = useMemo(
    () =>
      scope3CategoryIdsForDisplay({
        categoryIdsFromData: categoryIds,
        edited,
        showAllScope3Categories,
      }),
    [categoryIds, edited, showAllScope3Categories],
  );

  const resetScope3Category = (category: number) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const vals = { ...(next.scope3Categories ?? {}) };
      const vers = { ...(next.scope3CategoriesVerified ?? {}) };
      delete vals[k];
      delete vers[k];
      next.scope3Categories = Object.keys(vals).length ? vals : undefined;
      next.scope3CategoriesVerified = Object.keys(vers).length
        ? vers
        : undefined;
      return next;
    });
  };

  const setScope3CatVal = (
    category: number,
    value: string,
    hadOriginalValue: boolean,
  ) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const map = { ...(next.scope3Categories ?? {}) };
      const trimmedEmpty = value.trim() === "";
      if (trimmedEmpty && !hadOriginalValue) delete map[k];
      else map[k] = trimmedEmpty ? "" : value;
      next.scope3Categories = Object.keys(map).length ? map : undefined;
      return next;
    });
  };

  const setScope3CatVerified = (category: number, verified: boolean) => {
    const k = String(category);
    setEdited((prev) => {
      const next = { ...prev };
      const map = { ...(next.scope3CategoriesVerified ?? {}) };
      map[k] = verified;
      next.scope3CategoriesVerified = map;
      return next;
    });
  };

  return (
    <Scope3CategoriesCard
      title={t("editor.reportingPeriodQuickEdit.scope3CategoriesSection")}
      showAllLabel={t(
        "editor.reportingPeriodQuickEdit.showAllScope3Categories",
      )}
      showAllChecked={showAllScope3Categories}
      onToggleShowAll={setShowAllScope3Categories}
      ids={displayScope3CategoryIds}
      inputClassName={inputClassName}
      categoryLineLabel={(cat, name) =>
        t("editor.periodEditor.categoryLine", { n: cat, name })
      }
      categoryNameFor={(cat) => quickEditScope3CategoryName(cat, t)}
      getOriginalForCategory={(cat) => {
        const original = scope3Categories.find((c) => c.category === cat);
        return {
          value: original?.total ?? null,
          metadata: (original?.metadata as GarboFieldMetadata | null) ?? null,
        };
      }}
      getEditedValueForCategory={(cat) => {
        const original = scope3Categories.find((c) => c.category === cat);
        const originalVal = original?.total ?? null;
        const editedVal = edited.scope3Categories?.[String(cat)];
        return editedVal ?? (originalVal != null ? String(originalVal) : "");
      }}
      isEditedValueDirty={(cat) =>
        edited.scope3Categories?.[String(cat)] != null
      }
      getVerifiedForCategory={(cat) => {
        const original = scope3Categories.find((c) => c.category === cat);
        const originalVerified = !!original?.metadata?.verifiedBy;
        const hasEditedVerified =
          edited.scope3CategoriesVerified != null &&
          Object.prototype.hasOwnProperty.call(
            edited.scope3CategoriesVerified,
            String(cat),
          );
        return hasEditedVerified
          ? !!edited.scope3CategoriesVerified?.[String(cat)]
          : originalVerified;
      }}
      onChangeValue={(cat, next) => {
        const original = scope3Categories.find((c) => c.category === cat);
        const originalVal = original?.total ?? null;
        setScope3CatVal(cat, next, originalVal != null);
      }}
      onResetCategory={resetScope3Category}
      resetTitle={t("editor.periodEditor.resetCategoryTitle")}
      onToggleVerified={(cat, next) => setScope3CatVerified(cat, next)}
      toggleVerifiedTitle={t("editor.periodEditor.toggleVerifiedTitle")}
      fieldLabelForCategory={(cat) =>
        t("editor.reportingPeriodQuickEdit.scope3CategoryField", { n: cat })
      }
    />
  );
}
