import { useState, useEffect, useCallback } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import type { SwimlaneStatusType } from "@/lib/types";

export type PipelineStepStatus = "running" | "completed" | "failed";

/** Maps onto the same STATUS_CONFIG (status-config.tsx) the Jobbstatus
 * swimlane uses, so StatusPill renders identically in both places. */
export function toSwimlaneStatus(
  status: PipelineStepStatus | undefined,
): SwimlaneStatusType {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "running":
      return "processing";
    default:
      return "waiting";
  }
}

export interface PipelineStepRun {
  step: string;
  status: PipelineStepStatus;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  runId: string | null;
}

export interface ClimatePipelinePlan {
  id: string;
  url: string;
  extractedMunicipalityName: string | null;
  municipality: { id: string; name: string } | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  pipelineSteps: PipelineStepRun[];
  /** garbo's threadId for the parsePdf/doclingParsePDF job that produced
   * this plan's document — lets the tab look up and show PDF-parsing
   * status alongside this plan's own pipeline steps. */
  garboThreadId: string | null;
}

const POLL_MS = 5000;

export function useClimatePipelinePlans() {
  const [plans, setPlans] = useState<ClimatePipelinePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${getClimatePlansPipelineApiUrl()}/plans`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as ClimatePipelinePlan[];
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    const timer = window.setInterval(fetchPlans, POLL_MS);
    return () => window.clearInterval(timer);
  }, [fetchPlans]);

  return { plans, isLoading, error, refresh: fetchPlans };
}
