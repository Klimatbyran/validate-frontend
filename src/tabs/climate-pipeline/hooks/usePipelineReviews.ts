import { useCallback, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";

export type ReviewStatus = "OK" | "ISSUE" | "SUGGESTED_FIX";

export interface PipelineReview {
  id: string;
  climatePlanId: string;
  step: string;
  entityType: string;
  entityId: string;
  reviewedSnapshot: unknown;
  status: ReviewStatus;
  comment: string | null;
  suggestedValue: unknown;
  reviewedBy: string | null;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineReviewWithPlan extends PipelineReview {
  plan: {
    id: string;
    url: string;
    extractedMunicipalityName: string | null;
    municipality: { id: string; name: string } | null;
  };
}

export interface UpsertPipelineReviewInput {
  step: string;
  entityType: string;
  entityId: string;
  reviewedSnapshot: unknown;
  status: ReviewStatus;
  comment?: string | null;
  suggestedValue?: unknown;
  reviewedBy?: string | null;
}

export function reviewKey(
  step: string,
  entityType: string,
  entityId: string,
): string {
  return `${step}::${entityType}::${entityId}`;
}

export function indexReviewsByEntity(
  reviews: PipelineReview[],
): Map<string, PipelineReview> {
  const map = new Map<string, PipelineReview>();
  for (const review of reviews) {
    map.set(reviewKey(review.step, review.entityType, review.entityId), review);
  }
  return map;
}

export async function upsertPipelineReview(
  planId: string,
  input: UpsertPipelineReviewInput,
): Promise<PipelineReview> {
  const res = await fetch(
    `${getClimatePlansPipelineApiUrl()}/plans/${planId}/reviews`,
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
  return (await res.json()) as PipelineReview;
}

export async function deletePipelineReview(reviewId: string): Promise<void> {
  const res = await fetch(
    `${getClimatePlansPipelineApiUrl()}/reviews/${reviewId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export function usePipelineReviewsBoard(filters: {
  status?: ReviewStatus | "";
  step?: string;
  planId?: string;
}) {
  const [reviews, setReviews] = useState<PipelineReviewWithPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.step) params.set("step", filters.step);
      if (filters.planId) params.set("planId", filters.planId);
      params.set("limit", "200");

      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/reviews?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as {
        total: number;
        reviews: PipelineReviewWithPlan[];
      };
      setReviews(data.reviews);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.step, filters.planId]);

  return { reviews, total, isLoading, error, refresh: fetchReviews };
}
