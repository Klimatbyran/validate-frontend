import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";

// "merged" is set only via confirmShadowElementMerges below, never via
// updateShadowElementStatus's PATCH -- it always comes with a mergedIntoId,
// which that endpoint doesn't accept.
export type ShadowElementStatus =
  | "preliminary"
  | "promoted"
  | "rejected"
  | "merged";

// Set once by the mint check at creation time -- see reviewWeakMatch.ts's
// buildMintCheckPrompt. "specific": tied to one measurable activity, no
// narrowing needed. "narrowable": a real mechanism, but needed real
// narrowing to get there -- worth a human look. "vague": couldn't be
// pinned to one activity/operational unit even after trying.
export type ShadowElementQuality = "specific" | "narrowable" | "vague";

export interface ShadowElementAttachment {
  shiftId: string;
  isOrigin: boolean;
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  aiReviewExplanation: string | null;
  measureText: string;
  climatePlanId: string;
  municipalityName: string | null;
}

export interface ShadowElementOrigin {
  climatePlanId: string;
  documentTitle: string | null;
  url: string;
  municipalityName: string | null;
  measureText: string | null;
  shiftFrom: string | null;
  shiftTo: string | null;
}

// Soft-merged into this element -- nothing physically moved (see
// shadowTaxonomy.ts), the merged element's own row/attachments still exist,
// this is just a summary for showing "N elements merged into this" and
// offering an unlink action per merged element.
export interface MergedElementSummary {
  id: string;
  shortLabel: string;
  description: string;
  attachmentCount: number;
}

export interface ShadowElement {
  id: string;
  shortLabel: string;
  description: string;
  activityShiftCategory: string;
  sectorPath: string | null;
  status: ShadowElementStatus;
  qualityGrade: ShadowElementQuality;
  /** Reviewer note from the shadow-taxonomy UI; independent of status. */
  comment: string | null;
  createdAt: string;
  origin: ShadowElementOrigin | null;
  // Union of this element's own attachments and everything merged into it.
  attachments: ShadowElementAttachment[];
  mergedElements: MergedElementSummary[];
}

export interface MergeGroupMember {
  id: string;
  shortLabel: string;
  description: string;
  activityShiftCategory: string;
  attachmentCount: number;
  createdAt: string;
}

export interface MergeGroup {
  suggestedCanonicalId: string;
  members: MergeGroupMember[];
}

export interface RealTaxonomyOverlap {
  shadowElementId: string;
  shadowShortLabel: string;
  shadowDescription: string;
  realStableId: string;
  realShortLabel: string;
  realDescription: string;
  reasoning: string;
  attachedShifts: RecoveredShiftSummary[];
}

export interface ExistingRealMatch {
  stableId: string;
  shortLabel: string;
}

export interface RecoveredShiftSummary {
  shiftId: string;
  municipalityName: string | null;
  shiftFrom: string;
  shiftTo: string;
  measureText: string;
  // Real TEF matches the primary pass already attached to this commitment,
  // aside from the overlap being reviewed. Optional so a response from a
  // pipeline that predates this field still renders.
  existingRealMatches?: ExistingRealMatch[];
}

export interface RejectWithRecoveryResult {
  shadowElementId: string;
  shadowShortLabel: string;
  realStableId: string;
  realShortLabel: string;
  recoveredShifts: RecoveredShiftSummary[];
}

export function useShadowElements() {
  const [elements, setElements] = useState<ShadowElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchElements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/shadow-elements`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setElements((await res.json()) as ShadowElement[]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load shadow elements",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchElements();
  }, [fetchElements]);

  return { elements, isLoading, error, refresh: fetchElements };
}

export async function deleteAllShadowElements(): Promise<{
  deletedCount: number;
}> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { deletedCount: number };
}

/** Read-only detection pass -- proposes groups, writes nothing. Costs real
 * LLM calls server-side, so it's a POST behind auth even though it doesn't
 * mutate anything, same as every other authenticated action here. */
export async function fetchMergeCandidates(): Promise<MergeGroup[]> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/merge-candidates`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MergeGroup[];
}

/** Confirms specific groups a reviewer approved (possibly trimmed from what
 * fetchMergeCandidates proposed) -- soft merge, nothing physically moves. */
export async function confirmShadowElementMerges(
  groups: { canonicalId: string; mergedIds: string[] }[],
): Promise<{ mergedCount: number }> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/merge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { mergedCount: number };
}

/** Read-only audit against the real taxonomy -- proposes overlaps, writes
 * nothing. */
export async function fetchRealTaxonomyOverlaps(): Promise<
  RealTaxonomyOverlap[]
> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/real-taxonomy-overlaps`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as RealTaxonomyOverlap[];
}

/** Confirms specific overlaps a reviewer checked -- rejects each shadow
 * element and attaches the real TE as a recovered match on every shift
 * that was pointing at it, so the connection isn't lost. */
export async function rejectShadowElementsWithRecovery(
  items: { shadowElementId: string; realStableId: string }[],
): Promise<RejectWithRecoveryResult[]> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/reject-with-recovery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as RejectWithRecoveryResult[];
}

/** Reverts one merged element back to standalone preliminary. */
export async function unlinkShadowElement(id: string): Promise<void> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/${id}/unlink`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
}

export async function updateShadowElementStatus(
  id: string,
  status: ShadowElementStatus,
): Promise<ShadowElement> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ShadowElement;
}

/** Saves or clears a reviewer note without changing status. Empty/null clears. */
export async function updateShadowElementComment(
  id: string,
  comment: string | null,
): Promise<ShadowElement> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/${id}/comment`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ShadowElement;
}
