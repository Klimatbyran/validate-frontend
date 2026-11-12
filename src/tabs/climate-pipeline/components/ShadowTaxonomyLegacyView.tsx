import { Loader2 } from "lucide-react";
import { useShadowElementSnapshots } from "../hooks/useShadowElementSnapshots";
import { MunicipalityPill } from "./MunicipalityPill";
import { HandoffReviewNote } from "./HandoffReviewNote";
import { getHandoffReview } from "../lib/shadowTefHandoffReview";
import type {
  ShadowElementStatus,
  ShadowElementQuality,
} from "../hooks/useShadowElements";

const STATUS_STYLE: Record<ShadowElementStatus, string> = {
  preliminary: "border-purple-03/40 bg-purple-03/10 text-purple-03",
  promoted: "border-green-03/40 bg-green-03/10 text-green-03",
  rejected: "border-gray-03 bg-gray-03/40 text-gray-02",
  merged: "border-gray-03 bg-gray-03/20 text-gray-02/80",
};

const QUALITY_STYLE: Record<ShadowElementQuality, string> = {
  specific: "border-teal-03/40 bg-teal-03/10 text-teal-03",
  narrowable: "border-amber-03/40 bg-amber-03/10 text-amber-03",
  vague: "border-pink-03/40 bg-pink-03/10 text-pink-03",
};

// Read-only view of the whole shadow taxonomy as it stood at the moment a
// snapshot was taken -- taken deliberately before a TEF-matching rerun,
// see climate-plans-pipeline's ShadowTransitionElementSnapshot /
// POST /snapshots/tef-freeze. Never the same data as the live, editable
// list above it; every row here is frozen, independent of anything that
// happens to the live element afterward (promote/reject/merge/delete).
export function ShadowTaxonomyLegacyView({
  refreshToken,
  municipalityFilter,
}: {
  refreshToken?: number;
  /** Empty string means "all municipalities". */
  municipalityFilter?: string;
} = {}) {
  const { snapshotsByRun, isLoading, error } =
    useShadowElementSnapshots(refreshToken);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-02 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading legacy snapshot…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-03 py-4">{error}</p>;
  }

  if (snapshotsByRun.size === 0) {
    return (
      <p className="text-sm text-gray-02 py-4">
        No frozen shadow taxonomy snapshot exists yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {[...snapshotsByRun.entries()].map(([runId, allRows]) => {
        // Label/timestamp come from the full run, not the filtered subset
        // -- a municipality filter narrowing to zero rows in a given run
        // shouldn't make its own metadata disappear along with them.
        const label = allRows[0]?.snapshotLabel;
        const takenAt = allRows[0]?.snapshotTakenAt;
        const rows = municipalityFilter
          ? allRows.filter(
              (row) => row.originMunicipalityName === municipalityFilter,
            )
          : allRows;
        return (
          <div key={runId} className="space-y-3">
            <div className="text-xs text-gray-02 border-b border-gray-04 pb-2">
              {label ? <span className="font-medium">{label}</span> : null}
              {takenAt ? (
                <span className={label ? " ml-2" : ""}>
                  Frozen {new Date(takenAt).toLocaleString()} — {rows.length}{" "}
                  element{rows.length === 1 ? "" : "s"}
                  {municipalityFilter ? ` (of ${allRows.length})` : ""}
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border border-gray-04 bg-gray-05/40 p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-01">
                      {row.shortLabel}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-02">{row.description}</p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${QUALITY_STYLE[row.qualityGrade]}`}
                    >
                      {row.qualityGrade}
                    </span>
                    <span className="text-[10px] text-gray-02">
                      {row.activityShiftCategory}
                    </span>
                    <MunicipalityPill name={row.originMunicipalityName} />
                  </div>
                  {row.comment ? (
                    <p className="text-xs text-gray-02 italic">
                      “{row.comment}”
                    </p>
                  ) : null}
                  <HandoffReviewNote
                    review={getHandoffReview(row.originalId)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
