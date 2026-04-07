import { BadgeCheck, Undo2 } from "lucide-react";
import { IconActionButton } from "@/ui/icon-action-button";
import type { GarboFieldMetadata } from "../../../lib/types";
import { MetadataDetailsDialog } from "../../MetadataDetailsDialog";

export function EmissionsNumberCell({
  value,
  onChange,
  dirty,
  metadata,
  fieldLabel,
  verified,
  onToggleVerified,
  onUndo,
  undoDisabled,
  verifyTitle,
  verifyAriaLabel,
  undoTitle,
  undoAriaLabel,
  inputClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  dirty: boolean;
  metadata: GarboFieldMetadata | null;
  fieldLabel: string;
  verified: boolean;
  onToggleVerified: () => void;
  onUndo: () => void;
  undoDisabled: boolean;
  verifyTitle: string;
  verifyAriaLabel: string;
  undoTitle: string;
  undoAriaLabel: string;
  inputClassName: string;
}) {
  return (
    <>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          inputClassName +
          " placeholder:text-gray-02/70" +
          (dirty ? " border-orange-03" : "")
        }
        step="any"
      />
      <MetadataDetailsDialog fieldLabel={fieldLabel} metadata={metadata} />
      <IconActionButton onClick={onToggleVerified} aria-label={verifyAriaLabel} title={verifyTitle}>
        <BadgeCheck className={verified ? "text-green-03" : "text-gray-02"} />
      </IconActionButton>
      <IconActionButton
        disabled={undoDisabled}
        onClick={onUndo}
        aria-label={undoAriaLabel}
        title={undoTitle}
      >
        <Undo2 className="text-gray-02" />
      </IconActionButton>
    </>
  );
}

