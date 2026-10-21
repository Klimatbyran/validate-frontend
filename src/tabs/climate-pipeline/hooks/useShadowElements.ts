import { useCallback, useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";

export type ShadowElementStatus = "preliminary" | "promoted" | "rejected";

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

export interface ShadowElement {
  id: string;
  shortLabel: string;
  description: string;
  activityShiftCategory: string;
  sectorPath: string | null;
  status: ShadowElementStatus;
  qualityGrade: ShadowElementQuality;
  createdAt: string;
  origin: ShadowElementOrigin | null;
  attachments: ShadowElementAttachment[];
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
