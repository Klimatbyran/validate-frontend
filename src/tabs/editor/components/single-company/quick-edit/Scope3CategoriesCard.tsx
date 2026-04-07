import { BadgeCheck, Undo2 } from "lucide-react";
import { IconActionButton } from "@/ui/icon-action-button";
import type { GarboFieldMetadata } from "../../../lib/types";
import { MetadataDetailsDialog } from "../../MetadataDetailsDialog";

export function Scope3CategoriesCard({
  title,
  showAllLabel,
  showAllChecked,
  onToggleShowAll,
  ids,
  inputClassName,
  categoryLineLabel,
  categoryNameFor,
  getOriginalForCategory,
  getEditedValueForCategory,
  isEditedValueDirty,
  getVerifiedForCategory,
  onChangeValue,
  onResetCategory,
  resetTitle,
  onToggleVerified,
  toggleVerifiedTitle,
  fieldLabelForCategory,
}: {
  title: string;
  showAllLabel: string;
  showAllChecked: boolean;
  onToggleShowAll: (checked: boolean) => void;
  ids: number[];
  inputClassName: string;
  categoryLineLabel: (cat: number, name: string) => string;
  categoryNameFor: (cat: number) => string;
  getOriginalForCategory: (cat: number) => { value: number | null; metadata: GarboFieldMetadata | null };
  getEditedValueForCategory: (cat: number) => string;
  isEditedValueDirty: (cat: number) => boolean;
  getVerifiedForCategory: (cat: number) => boolean;
  onChangeValue: (cat: number, next: string) => void;
  onResetCategory: (cat: number) => void;
  resetTitle: string;
  onToggleVerified: (cat: number, next: boolean) => void;
  toggleVerifiedTitle: string;
  fieldLabelForCategory: (cat: number) => string;
}) {
  return (
    <div className="rounded-lg bg-gray-04 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-sm font-medium text-gray-01">{title}</div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01 shrink-0">
          <input
            type="checkbox"
            checked={showAllChecked}
            onChange={(e) => onToggleShowAll(e.target.checked)}
            className="rounded border-gray-03"
          />
          {showAllLabel}
        </label>
      </div>
      <div className="space-y-2">
        {ids.map((cat) => {
          const original = getOriginalForCategory(cat);
          const val = getEditedValueForCategory(cat);
          const dirty = isEditedValueDirty(cat);
          const verified = getVerifiedForCategory(cat);
          return (
            <div key={cat}>
              <div className="text-xs text-gray-02 mb-1">
                {categoryLineLabel(cat, categoryNameFor(cat))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={val}
                  onChange={(e) => onChangeValue(cat, e.target.value)}
                  className={
                    inputClassName +
                    " bg-gray-04 !w-44 !max-w-none " +
                    (dirty ? " border-orange-03" : "")
                  }
                />
                <MetadataDetailsDialog
                  fieldLabel={fieldLabelForCategory(cat)}
                  metadata={original.metadata}
                />
                <IconActionButton
                  variant="md"
                  onClick={() => onResetCategory(cat)}
                  title={resetTitle}
                  aria-label={resetTitle}
                >
                  <Undo2 className="text-gray-02" />
                </IconActionButton>
                <IconActionButton
                  variant="md"
                  onClick={() => onToggleVerified(cat, !verified)}
                  title={toggleVerifiedTitle}
                  aria-label={toggleVerifiedTitle}
                >
                  <BadgeCheck className={verified ? "text-green-03" : "text-gray-02"} />
                </IconActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

