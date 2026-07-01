import type { ReactNode } from "react";
import type { GarboFieldMetadata } from "../../../lib/types";
import { MetadataVerifyUndoActions } from "../../MetadataVerifyUndoActions";

export function QuickEditNumberRow({
  label,
  value,
  onChange,
  dirty,
  inputClassName,
  metadata,
  fieldLabel,
  onReset,
  resetTitle,
  verified,
  onToggleVerified,
  toggleVerifiedTitle,
  rightSlot,
}: {
  label: ReactNode;
  value: string;
  onChange: (next: string) => void;
  dirty: boolean;
  inputClassName: string;
  metadata: GarboFieldMetadata | null;
  fieldLabel: string;
  onReset: () => void;
  resetTitle: string;
  verified: boolean;
  onToggleVerified: () => void;
  toggleVerifiedTitle: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-01 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            inputClassName +
            " bg-gray-04 !w-44 !max-w-none " +
            (dirty ? " border-orange-03" : "")
          }
          step="any"
        />
        {rightSlot}
        <MetadataVerifyUndoActions
          fieldLabel={fieldLabel}
          metadata={metadata}
          verified={verified}
          onToggleVerified={onToggleVerified}
          verifyTitle={toggleVerifiedTitle}
          verifyAriaLabel={toggleVerifiedTitle}
          onUndo={onReset}
          undoTitle={resetTitle}
          undoAriaLabel={resetTitle}
          variant="md"
        />
      </div>
    </div>
  );
}
