import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShadowElementSnapshots } from "../hooks/useShadowElementSnapshots";
import {
  computeShadowElementDiff,
  type ShadowElementChange,
} from "../lib/shadow-element-diff";
import { MunicipalityPill } from "./MunicipalityPill";
import { HandoffReviewNote } from "./HandoffReviewNote";
import { getHandoffReview } from "../lib/shadowTefHandoffReview";
import type {
  ShadowElement,
  ShadowElementStatus,
  ShadowElementQuality,
} from "../hooks/useShadowElements";

const DIFF_BADGE: Record<"new" | "changed" | "same", string> = {
  new: "border-green-03/40 bg-green-03/10 text-green-03",
  changed: "border-amber-03/40 bg-amber-03/10 text-amber-03",
  same: "border-gray-03 bg-gray-03/20 text-gray-02",
};

const DIFF_LABEL: Record<"new" | "changed" | "same", string> = {
  new: "New",
  changed: "Changed",
  same: "Same",
};

// Same palette as ShadowTaxonomyLegacyView / ShadowElementCard -- kept as
// its own copy rather than a shared import, matching how those two already
// each keep their own copy instead of a shared module.
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

function DiffBadge({ status }: { status: "new" | "changed" | "same" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        DIFF_BADGE[status],
      )}
    >
      {DIFF_LABEL[status]}
    </span>
  );
}

// The reviewer's verdict on this element -- status (e.g. "rejected" when a
// human decided it didn't belong) and quality grade (e.g. "vague"/
// "narrowable" when the mint check judged it too broad to pin to one
// activity) plus their free-text comment if they left one. Shown
// unconditionally, not just when something changed vs. the snapshot --
// an unchanged "same" entry can still be exactly the one a reviewer wants
// an explanation for (e.g. "why does this still exist in both?").
function ReviewVerdict({
  status,
  qualityGrade,
  comment,
}: {
  status: ShadowElementStatus;
  qualityGrade: ShadowElementQuality;
  comment: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          STATUS_STYLE[status],
        )}
      >
        {status}
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          QUALITY_STYLE[qualityGrade],
        )}
      >
        {qualityGrade}
      </span>
      {comment ? (
        <span className="text-xs text-orange-03/90 break-words">
          “{comment}”
        </span>
      ) : null}
    </div>
  );
}

function ChangeList({ changes }: { changes: ShadowElementChange[] }) {
  if (changes.length === 0) return null;
  return (
    <ul className="text-xs text-amber-03 space-y-0.5">
      {changes.map((c) => (
        <li key={c.field}>
          {c.field}: <span className="text-gray-02">{c.from || "(none)"}</span>{" "}
          → <span className="font-medium">{c.to || "(none)"}</span>
        </li>
      ))}
    </ul>
  );
}

// Live elements vs. the frozen shadow-taxonomy snapshot -- see
// computeShadowElementDiff for how "new"/"same"/"changed"/removed are
// decided. Fetches the snapshot itself (same pattern as
// ShadowTaxonomyLegacyView) rather than taking it as a prop.
export function ShadowTaxonomyDiffView({
  elements,
  refreshToken,
  municipalityFilter,
}: {
  elements: ShadowElement[];
  refreshToken?: number;
  /** Empty string means "all municipalities". */
  municipalityFilter?: string;
}) {
  const { snapshots, isLoading, error } =
    useShadowElementSnapshots(refreshToken);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-02 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading snapshot…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-03 py-4">{error}</p>;
  }
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-gray-02 py-4">
        No frozen snapshot exists yet — take one to compare against.
      </p>
    );
  }

  const fullDiff = computeShadowElementDiff(elements, snapshots);
  // Filtered after computing the diff, not before -- each entry's
  // new/same/changed status only ever depends on its own element vs. its
  // own snapshot row, never on what else is in the list, so narrowing to
  // one municipality afterward doesn't change anyone's classification.
  const entries = municipalityFilter
    ? fullDiff.entries.filter(
        (e) =>
          (e.element.origin?.municipalityName ?? null) === municipalityFilter,
      )
    : fullDiff.entries;
  const removed = municipalityFilter
    ? fullDiff.removed.filter(
        (r) => r.originMunicipalityName === municipalityFilter,
      )
    : fullDiff.removed;
  const newCount = entries.filter((e) => e.status === "new").length;
  const changedCount = entries.filter((e) => e.status === "changed").length;
  const sameCount = entries.filter((e) => e.status === "same").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-02">
        <span>{newCount} new</span>
        <span>·</span>
        <span>{changedCount} changed</span>
        <span>·</span>
        <span>{sameCount} unchanged</span>
        {removed.length > 0 && (
          <>
            <span>·</span>
            <span>{removed.length} removed</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {entries.map(({ element, status, changes }) => (
          <div
            key={element.id}
            className="rounded-md border border-gray-03/50 bg-gray-05/30 p-2.5 space-y-1.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <DiffBadge status={status} />
              <span className="text-sm font-medium text-gray-01">
                {element.shortLabel}
              </span>
              <MunicipalityPill
                name={element.origin?.municipalityName ?? null}
              />
            </div>
            <ReviewVerdict
              status={element.status}
              qualityGrade={element.qualityGrade}
              comment={element.comment}
            />
            <HandoffReviewNote review={getHandoffReview(element.id)} />
            <ChangeList changes={changes} />
          </div>
        ))}
      </div>

      {removed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-pink-03">
            Removed since snapshot
          </h4>
          {removed.map((r) => (
            <div
              key={r.originalId}
              className="rounded-md border border-pink-03/30 bg-pink-03/5 p-2.5 space-y-1.5 opacity-80"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm text-gray-01">{r.shortLabel}</p>
                <MunicipalityPill name={r.originMunicipalityName} />
              </div>
              <p className="text-xs text-gray-02">{r.description}</p>
              <ReviewVerdict
                status={r.status}
                qualityGrade={r.qualityGrade}
                comment={r.comment}
              />
              <HandoffReviewNote review={getHandoffReview(r.originalId)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
