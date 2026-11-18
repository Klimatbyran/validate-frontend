import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";

export interface TransitionElementSummary {
  stableId: string;
  version: number;
  shortLabel: string;
  description: string;
  sectorPath: string;
}

export interface TransitionElement {
  id: string;
  stableId: string;
  version: number;
  isCurrent: boolean;
  shortLabel: string;
  description: string;
  sectorId: string | null;
  sectorPath: string;
  activityShiftCategory: string | null;
  legacyExportType: string | null;
  sustainabilityClass: string | null;
  coBenefits: string[];
  ipccRef: string | null;
  actsOnLabels: string[];
  shiftsToLabels: string[];
  status: string;
  versionIntroduced: string | null;
  versionDeprecated: string | null;
  embeddingModel: string;
  editedBy: string | null;
  createdAt: string;
}

export type TransitionElementEdit = Partial<
  Pick<
    TransitionElement,
    | "shortLabel"
    | "description"
    | "sectorId"
    | "sectorPath"
    | "actsOnLabels"
    | "shiftsToLabels"
    | "coBenefits"
    | "sustainabilityClass"
  >
> & { editedBy?: string | null };

/** A single similarity-search hit against the real taxonomy — same shape
 * backend's TEMatch (teLookup.ts), not the full TransitionElement row. */
export interface TransitionElementMatch {
  stableId: string;
  shortLabel: string;
  description: string;
  sectorPath: string;
  actsOnLabels: string[];
  shiftsToLabels: string[];
  activityShiftCategory: string | null;
  legacyExportType: "shift" | "improve" | null;
  sustainabilityClass: "green" | "amber" | "red" | null;
  coBenefits: string[];
  score: number;
}

export interface TransitionElementCreate {
  shortLabel: string;
  description: string;
  sectorPath: string;
  activityShiftCategory: string;
  sectorId?: string | null;
  actsOnLabels?: string[];
  shiftsToLabels?: string[];
  coBenefits?: string[];
  sustainabilityClass?: string | null;
  editedBy?: string | null;
}

/** Plain substring search (isCurrent rows only) — same bar as
 * municipality-sources: reference data, not sensitive, reads don't need
 * auth. Exported directly for one-off calls (e.g. the shadow-taxonomy
 * review's manual-search fallback, for when none of the semantic
 * candidates fit); useTransitionElementSearch below wraps it for
 * TaxonomyTab's own live, debounced search box. */
export async function searchTransitionElements(
  q: string,
): Promise<TransitionElementSummary[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await fetch(
    `${getClimatePlansPipelineApiUrl()}/transition-elements?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as TransitionElementSummary[];
}

export function useTransitionElementSearch(q: string) {
  const [results, setResults] = useState<TransitionElementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setIsLoading(true);
    try {
      setResults(await searchTransitionElements(q));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search transition elements",
      );
    } finally {
      setIsLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void search();
  }, [search]);

  return { results, isLoading, error, refresh: search };
}

export async function getCurrentTransitionElement(
  stableId: string,
): Promise<TransitionElement> {
  const res = await fetch(
    `${getClimatePlansPipelineApiUrl()}/transition-elements/${stableId}`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as TransitionElement;
}

/** Full version history, oldest (the original) first. */
export async function getTransitionElementVersions(
  stableId: string,
): Promise<TransitionElement[]> {
  const res = await fetch(
    `${getClimatePlansPipelineApiUrl()}/transition-elements/${stableId}/versions`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as TransitionElement[];
}

/** Edit never overwrites — the backend flips the current row's isCurrent to
 * false and inserts a new version, re-embedding just this one record. */
export async function updateTransitionElement(
  stableId: string,
  edit: TransitionElementEdit,
): Promise<TransitionElement> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/transition-elements/${stableId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TransitionElement;
}

/** On-demand similarity search for one shadow element, from the
 * shadow-taxonomy review flow — separate from (and no auth-avoiding
 * shortcut past) useTransitionElementSearch's plain text search above. POST
 * because it costs a real embedding call server-side, even though it reads
 * only. */
export async function findSimilarRealElements(
  shadowElementId: string,
): Promise<TransitionElementMatch[]> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/shadow-elements/${shadowElementId}/similar-real-elements`,
    { method: "POST" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TransitionElementMatch[];
}

/** Mints a brand-new real element (version 1) — e.g. from the shadow-
 * taxonomy "add as new real element instead" flow. Unlike updateTransitionElement
 * there's no prior row, so the backend generates a fresh stableId from
 * shortLabel rather than taking one as a parameter. */
export async function createTransitionElement(
  input: TransitionElementCreate,
): Promise<TransitionElement> {
  const res = await authenticatedFetch(
    `${getClimatePlansPipelineApiUrl()}/transition-elements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TransitionElement;
}
