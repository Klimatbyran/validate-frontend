/** Shared by TaxonomyTab's search list and ShadowTaxonomyTab's candidate
 * pickers (semantic matches and the manual-search fallback) -- anywhere a
 * real TransitionElement is shown for a reviewer to look at or pick,
 * whether that's the fields on a TransitionElementSummary, a
 * TransitionElementMatch, or the full TransitionElement row. */
export interface ProvenanceFields {
  version: number;
  editedBy: string | null;
  status: string;
  handoffBroadened: boolean;
}

/** Where this element came from before this app ever touched it --
 * independent of version/editedBy, and (unlike relying on description
 * text) survives edits, since both `status` and `handoffBroadened` are
 * carried forward on every PATCH rather than overwritten. */
export function seedOriginOf(
  r: Pick<ProvenanceFields, "status" | "handoffBroadened">,
): "extended" | "broadened" | "original" {
  if (r.status === "shadow") return "extended";
  if (r.handoffBroadened) return "broadened";
  return "original";
}

/** Combines in-app provenance (version/editedBy) with seed-time origin
 * (seedOriginOf) -- an in-app edit always takes top billing (it's the
 * most recent, most relevant fact), but the badge still names what it
 * started as, rather than discarding that once something's been edited. */
export function provenanceOf(
  r: ProvenanceFields,
): { labelKey: string; className: string } {
  const origin = seedOriginOf(r);

  if (r.version > 1) {
    return {
      labelKey:
        origin === "extended"
          ? "taxonomy.provenanceEditedBroadenedFromExtended"
          : origin === "broadened"
            ? "taxonomy.provenanceEditedBroadenedFromBroadened"
            : "taxonomy.provenanceEditedBroadened",
      className: "border-orange-03/40 bg-orange-03/10 text-orange-03",
    };
  }
  if (r.editedBy) {
    return {
      labelKey: "taxonomy.provenanceEditedAdded",
      className: "border-green-03/40 bg-green-03/10 text-green-03",
    };
  }
  if (origin === "extended") {
    return {
      labelKey: "taxonomy.provenanceExtendedTef",
      className: "border-purple-03/40 bg-purple-03/10 text-purple-03",
    };
  }
  if (origin === "broadened") {
    return {
      labelKey: "taxonomy.provenanceBroadenedTef",
      className: "border-blue-03/40 bg-blue-03/10 text-blue-03",
    };
  }
  return {
    labelKey: "taxonomy.provenanceOriginal",
    className: "border-gray-03 bg-gray-03/40 text-gray-02",
  };
}
