import { MapPin } from "lucide-react";

// Small "which municipality did this come from" marker for a shadow
// element, usable on both a live element (element.origin?.municipalityName)
// and a frozen snapshot row (originMunicipalityName) -- lets a reviewer
// re-run one municipality and compare whether the same element still
// originates from it. Renders nothing once the name is unknown rather
// than showing an empty/placeholder pill.
export function MunicipalityPill({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-03 bg-gray-04/60 px-2 py-0.5 text-[11px] font-medium text-gray-01">
      <MapPin className="w-3 h-3 text-gray-02" />
      {name}
    </span>
  );
}
