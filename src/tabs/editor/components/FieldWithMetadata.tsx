import type { ReactNode } from "react";
import type { GarboFieldMetadata } from "../lib/types";
import { MetadataDetailsDialog } from "./MetadataDetailsDialog";

export function FieldWithMetadata({
  label,
  fieldLabel,
  metadata,
  children,
}: {
  label: ReactNode;
  /** Label used inside the metadata dialog title/trigger. */
  fieldLabel: string;
  metadata: GarboFieldMetadata | null;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 lg:min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-xs font-medium text-gray-01">
          {label}
        </label>
        <MetadataDetailsDialog fieldLabel={fieldLabel} metadata={metadata} />
      </div>
      {children}
    </div>
  );
}
