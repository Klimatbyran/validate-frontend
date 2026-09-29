import { BadgeCheck, Undo2 } from "lucide-react";
import { IconActionButton } from "@/ui/icon-action-button";
import type {
  GarboFieldMetadata,
  GarboMetadataHistory,
} from "../lib/types";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";

export function MetadataVerifyUndoActions({
  fieldLabel,
  metadata,
  metadataHistory,
  verified,
  onToggleVerified,
  verifyTitle,
  verifyAriaLabel,
  onUndo,
  undoTitle,
  undoAriaLabel,
  undoDisabled = false,
  variant = "md",
}: {
  fieldLabel: string;
  metadata: GarboFieldMetadata | null;
  metadataHistory?: GarboMetadataHistory | null;
  verified: boolean;
  onToggleVerified: () => void;
  verifyTitle: string;
  verifyAriaLabel: string;
  onUndo: () => void;
  undoTitle: string;
  undoAriaLabel: string;
  undoDisabled?: boolean;
  variant?: "md" | "sm";
}) {
  return (
    <>
      <MetadataDetailsDialog
        fieldLabel={fieldLabel}
        metadata={metadata}
        metadataHistory={metadataHistory}
      />
      <IconActionButton
        variant={variant}
        onClick={onToggleVerified}
        aria-label={verifyAriaLabel}
        title={verifyTitle}
      >
        <BadgeCheck className={verified ? "text-green-03" : "text-gray-02"} />
      </IconActionButton>
      <IconActionButton
        variant={variant}
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
