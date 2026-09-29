import type { ReactNode } from "react";
import type {
  GarboFieldMetadata,
  GarboMetadataHistory,
} from "../lib/types";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";

export function FieldWithMetadata({
  label,
  fieldLabel,
  metadata,
  metadataHistory,
  children,
}: {
  label: ReactNode;
  /** Label used inside the metadata dialog title/trigger. */
  fieldLabel: string;
  metadata: GarboFieldMetadata | null;
  metadataHistory?: GarboMetadataHistory | null;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 lg:min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-xs font-medium text-gray-01">
          {label}
        </label>
        <MetadataDetailsDialog
          fieldLabel={fieldLabel}
          metadata={metadata}
          metadataHistory={metadataHistory}
        />
      </div>
      {children}
    </div>
  );
}
