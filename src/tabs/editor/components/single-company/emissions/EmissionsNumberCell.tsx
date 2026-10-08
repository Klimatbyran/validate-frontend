import type {
  GarboFieldMetadata,
  GarboMetadataHistory,
} from "../../../lib/types";
import { MetadataVerifyUndoActions } from "../../MetadataVerifyUndoActions";

export function EmissionsNumberCell({
  value,
  onChange,
  dirty,
  metadata,
  metadataHistory,
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
  metadataHistory?: GarboMetadataHistory | null;
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
      <MetadataVerifyUndoActions
        fieldLabel={fieldLabel}
        metadata={metadata}
        metadataHistory={metadataHistory}
        verified={verified}
        onToggleVerified={onToggleVerified}
        verifyTitle={verifyTitle}
        verifyAriaLabel={verifyAriaLabel}
        onUndo={onUndo}
        undoDisabled={undoDisabled}
        undoTitle={undoTitle}
        undoAriaLabel={undoAriaLabel}
        variant="sm"
      />
    </>
  );
}
