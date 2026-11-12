import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShadowElementSnapshots } from "../hooks/useShadowElementSnapshots";
import {
  computeShadowElementDiff,
  type ShadowElementChange,
} from "../lib/shadow-element-diff";
import { MunicipalityPill } from "./MunicipalityPill";
import type { ShadowElement } from "../hooks/useShadowElements";

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
}: {
  elements: ShadowElement[];
  refreshToken?: number;
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

  const { entries, removed } = computeShadowElementDiff(elements, snapshots);
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
              className="rounded-md border border-pink-03/30 bg-pink-03/5 p-2.5 opacity-80"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm text-gray-01">{r.shortLabel}</p>
                <MunicipalityPill name={r.originMunicipalityName} />
              </div>
              <p className="text-xs text-gray-02">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
