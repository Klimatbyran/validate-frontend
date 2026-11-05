import { useState } from "react";
import {
  Check,
  ChevronsDown,
  ChevronsUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import {
  getClimatePlansPipelineApiUrl,
  getClimatePlansPipelineWebhookUrl,
  CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
} from "@/config/api-env";
import { authenticatedFetch } from "@/lib/api-helpers";
import { createJobsFromUrls } from "@/tabs/upload/lib/upload-api";
import { StatusPill } from "@/components/StatusPill";
import {
  toSwimlaneStatus,
  type PipelineStepRun,
} from "../hooks/useClimatePipelinePlans";
import { approvePlan } from "../hooks/useClimatePlanDetail";

export function PreviousStepRuns({ runs }: { runs: PipelineStepRun[] }) {
  const [expanded, setExpanded] = useState(false);

  if (runs.length === 0) return null;

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded((v) => !v)}
        className="h-6 px-2 text-xs text-blue-03 hover:text-blue-04 hover:bg-blue-03/10"
      >
        {expanded ? (
          <>
            <ChevronsUp className="w-3 h-3 mr-1" /> Hide previous runs
          </>
        ) : (
          <>
            <ChevronsDown className="w-3 h-3 mr-1" /> {runs.length} previous{" "}
            {runs.length === 1 ? "run" : "runs"}
          </>
        )}
      </Button>
      {expanded && (
        <ul className="mt-2 space-y-1.5 border-l-2 border-gray-03 pl-3">
          {runs.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <StatusPill
                label={r.status}
                status={toSwimlaneStatus(r.status)}
                isActive={false}
              />
              <span className="text-gray-02">
                {new Date(r.startedAt).toLocaleString()}
                {r.completedAt &&
                  ` · finished ${new Date(r.completedAt).toLocaleString()}`}
              </span>
              {r.error && <span className="text-pink-03">{r.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RerunButton({
  planId,
  step,
  onRerun,
}: {
  planId: string;
  step: string;
  onRerun: () => void;
}) {
  const [loadingMode, setLoadingMode] = useState<"cascade" | "single" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (noCascade: boolean) => {
    setLoadingMode(noCascade ? "single" : "cascade");
    setError(null);
    try {
      const url = `${getClimatePlansPipelineApiUrl()}/plans/${planId}/rerun/${step}${
        noCascade ? "?noCascade=true" : ""
      }`;
      const res = await authenticatedFetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      onRerun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rerun");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleClick(false)}
        disabled={loadingMode !== null}
        className="h-7 px-3 text-xs"
        title="Rerun this step and cascade through every step after it"
      >
        {loadingMode === "cascade" ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun from here
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleClick(true)}
        disabled={loadingMode !== null}
        className="h-7 px-3 text-xs"
        title="Rerun only this step, without re-running anything downstream"
      >
        {loadingMode === "single" ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun only this step
      </Button>
      {error && <span className="text-xs text-pink-03">{error}</span>}
    </div>
  );
}

export function ApproveButton({
  planId,
  extractedName,
  approvedName,
  onApproved,
}: {
  planId: string;
  extractedName: string | null;
  approvedName: string | null;
  onApproved: () => void;
}) {
  const [isApproving, setIsApproving] = useState(false);

  if (approvedName) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-03">
        <Check className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approvePlan(planId);
      toast.success(`Approved — linked to ${result.municipalityName}`);
      onApproved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!extractedName || isApproving}
      onClick={() => void handleApprove()}
      className="h-6 px-2 text-xs border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
      title={
        extractedName
          ? `Link this plan to the "${extractedName}" municipality`
          : "No extracted name to approve yet"
      }
    >
      {isApproving ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Check className="w-3 h-3 mr-1" />
      )}
      Approve
    </Button>
  );
}

export function RunCompanionButton({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await createJobsFromUrls({
        urls: [url],
        autoApprove: false,
        forceReindex: false,
        readImages: true,
        callbackUrl: getClimatePlansPipelineWebhookUrl(),
        reportTypeSlug: CLIMATE_PLANS_PIPELINE_REPORT_TYPE_SLUG,
      });
      toast.success(`Started pipeline for "${name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isRunning}
      onClick={handleRun}
      className="h-6 px-2 text-xs border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
      title={`Start the pipeline for "${name}" as its own climate plan`}
    >
      {isRunning ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : (
        <Play className="w-3 h-3 mr-1" />
      )}
      Run
    </Button>
  );
}

export function StepNavArrow({
  direction,
  stepName,
  onClick,
}: {
  direction: "prev" | "next";
  stepName: string;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      title={stepName}
      aria-label={
        direction === "prev"
          ? `Previous worker: ${stepName}`
          : `Next worker: ${stepName}`
      }
      className={cn(
        "flex max-w-[9.5rem] flex-col items-center gap-1 rounded-xl border border-gray-03/80",
        "bg-gray-04/95 px-2.5 py-2.5 text-gray-01 shadow-lg backdrop-blur",
        "hover:border-blue-03/50 hover:bg-gray-03/80 hover:text-blue-03",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-03",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">
        {stepName}
      </span>
    </button>
  );
}
