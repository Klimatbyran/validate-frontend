import { useState } from "react";
import { ChevronsDown, ChevronsUp, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/ui/button";
import type { QueueJob } from "@/lib/types";
import { getQueueDisplayName } from "@/lib/workflow-config";
import { JobDetailsDialog } from "@/tabs/jobbstatus/components/job-details/JobDetailsDialog";
import {
  useClimatePipelinePlans,
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "./hooks/useClimatePipelinePlans";
import { StepResultDialog } from "./components/StepResultDialog";
import {
  usePdfParsingJobs,
  derivePdfJobStatus,
  toQueueJobPlaceholder,
  PDF_PARSING_QUEUES,
} from "./hooks/usePdfParsingJobs";

const COMMITMENT_STEPS = [
  "extractMunicipality",
  "extractCommitments",
  "filterCommitmentsClimate",
  "filterCommitmentsActionable",
  "groupCommitmentsSimilar",
  "groupCommitmentsThemes",
] as const;

const MEASURE_STEPS = [
  "extractMeasures",
  "scoreMeasures",
  "matchTransitionElements",
] as const;

interface PlanRowProps {
  plan: ClimatePipelinePlan;
  onStepClick: (
    plan: ClimatePipelinePlan,
    step: string,
    runId?: string,
  ) => void;
  onPdfJobClick: (job: QueueJob) => void;
}

function StepStatusPill({
  step,
  run,
  isRerun,
  onClick,
}: {
  step: string;
  run?: PipelineStepRun;
  isRerun?: boolean;
  onClick: () => void;
}) {
  return (
    <StatusPill
      label={step}
      status={toSwimlaneStatus(run?.status)}
      isActive={run?.status === "running"}
      jobExists={run !== undefined}
      isRerun={isRerun}
      onClick={onClick}
    />
  );
}

function formatRunLabel(run: PipelineStepRun[]): string {
  // A run's "start" is the earliest step it triggered — the cascade's
  // entry point (webhook, start-commitments, rerun/:step, ...).
  if (run.length === 0) return "Unknown run";
  const earliest = run.reduce((min, r) =>
    new Date(r.startedAt) < new Date(min.startedAt) ? r : min,
  );
  return new Date(earliest.startedAt).toLocaleString();
}

function stepsByRun(rows: PipelineStepRun[]): Map<string, PipelineStepRun[]> {
  const map = new Map<string, PipelineStepRun[]>();
  for (const r of rows) map.set(r.step, [r]);
  return map;
}

function PlanRow({ plan, onStepClick, onPdfJobClick }: PlanRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { jobsByQueue: pdfJobsByQueue } = usePdfParsingJobs(plan.garboThreadId);

  // pipelineSteps is ordered newest-first per step. Group all runs per step
  // so the pill can show the latest status plus an isRerun flag when a step
  // has run more than once.
  const runsByStep = new Map<string, PipelineStepRun[]>();
  for (const s of plan.pipelineSteps) {
    const list = runsByStep.get(s.step) ?? [];
    list.push(s);
    runsByStep.set(s.step, list);
  }

  // Rows sharing a runId were all triggered by the same cascade (a single
  // upload or rerun) — group by that to offer previous runs as their own
  // dimmed sub-sections below, same pattern as jobbstatus's YearRow "Visa
  // fler" expand. Rows from before runId existed have no group and are
  // excluded.
  const byRunId = new Map<string, PipelineStepRun[]>();
  for (const s of plan.pipelineSteps) {
    if (!s.runId) continue;
    const list = byRunId.get(s.runId) ?? [];
    list.push(s);
    byRunId.set(s.runId, list);
  }
  const runsNewestFirst = [...byRunId.entries()].sort(
    ([, a], [, b]) =>
      new Date(b[0].startedAt).getTime() - new Date(a[0].startedAt).getTime(),
  );
  const previousRuns = runsNewestFirst.slice(1);
  const hasPreviousRuns = previousRuns.length > 0;

  const name =
    plan.municipality?.name ?? plan.extractedMunicipalityName ?? plan.url;

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-01 truncate">{name}</h3>
            <p className="text-xs text-gray-02 truncate">{plan.url}</p>
          </div>
          {hasPreviousRuns && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((v) => !v)}
              className="h-6 px-2 text-xs text-blue-03 hover:text-blue-04 hover:bg-blue-03/10 shrink-0 w-auto min-w-0"
            >
              {isExpanded ? (
                <>
                  <ChevronsUp className="w-3 h-3 mr-1" />
                  Visa färre
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3 h-3 mr-1" />
                  Visa fler ({previousRuns.length} tidigare)
                </>
              )}
            </Button>
          )}
        </div>
        <span className="text-xs text-gray-02 shrink-0">{plan.status}</span>
      </div>
      {plan.garboThreadId && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-03/50">
          {PDF_PARSING_QUEUES.map((queueId) => {
            const job = pdfJobsByQueue.get(queueId);
            return (
              <StatusPill
                key={queueId}
                label={getQueueDisplayName(queueId)}
                status={job ? derivePdfJobStatus(job) : "waiting"}
                isActive={
                  job ? derivePdfJobStatus(job) === "processing" : false
                }
                jobExists={job !== undefined}
                onClick={() => job && onPdfJobClick(toQueueJobPlaceholder(job))}
              />
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COMMITMENT_STEPS.map((step) => (
          <StepStatusPill
            key={step}
            step={step}
            run={runsByStep.get(step)?.[0]}
            isRerun={(runsByStep.get(step)?.length ?? 0) > 1}
            onClick={() => onStepClick(plan, step)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-03/50">
        {MEASURE_STEPS.map((step) => (
          <StepStatusPill
            key={step}
            step={step}
            run={runsByStep.get(step)?.[0]}
            isRerun={(runsByStep.get(step)?.length ?? 0) > 1}
            onClick={() => onStepClick(plan, step)}
          />
        ))}
      </div>

      {isExpanded && hasPreviousRuns && (
        <div className="border-t border-gray-03 bg-gray-04/30 -mx-4 -mb-4 px-4 pb-4 pt-3 space-y-3 rounded-b-[20px]">
          <p className="text-xs text-gray-02 font-medium">
            Tidigare körningar:
          </p>
          {previousRuns.map(([runId, rows]) => {
            const runStepMap = stepsByRun(rows);
            return (
              <div
                key={runId}
                className="border-t border-gray-03/50 pt-3 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-02">Tidigare körning</span>
                  <span className="text-xs text-gray-02 font-mono bg-gray-04 px-1.5 py-0.5 rounded">
                    {runId.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-02">
                    {formatRunLabel(rows)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-05/50 opacity-75 rounded-lg">
                  {[...COMMITMENT_STEPS, ...MEASURE_STEPS].map((step) => (
                    <StepStatusPill
                      key={step}
                      step={step}
                      run={runStepMap.get(step)?.[0]}
                      onClick={() => onStepClick(plan, step, runId)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClimatePipelineTab() {
  const { t } = useI18n();
  const { plans, isLoading, error, refresh } = useClimatePipelinePlans();
  // Looked up live from `plans` (rather than storing the plan object itself)
  // so an already-open dialog picks up polling/rerun updates instead of
  // showing whatever pipelineSteps looked like at the moment it was opened.
  const [dialogPlanId, setDialogPlanId] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState<string | null>(null);
  const [dialogRunId, setDialogRunId] = useState<string | null>(null);
  const dialogPlan = plans.find((p) => p.id === dialogPlanId) ?? null;

  // Separate dialog for PDF-parsing pills — these are raw garbo BullMQ jobs,
  // not climate-plans-pipeline's own PipelineStepRun rows, so they reuse
  // jobbstatus's JobDetailsDialog directly instead of StepResultDialog.
  const [pdfJob, setPdfJob] = useState<QueueJob | null>(null);

  const handleStepClick = (
    plan: ClimatePipelinePlan,
    step: string,
    runId?: string,
  ) => {
    setDialogPlanId(plan.id);
    setDialogStep(step);
    setDialogRunId(runId ?? null);
  };

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("climatePipeline.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1">
            {t("climatePipeline.subtitle")}
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-full hover:bg-gray-03/40 text-gray-02"
          aria-label={t("climatePipeline.refresh")}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-blue-03 animate-spin" />
        </div>
      ) : error && plans.length === 0 ? (
        <p className="text-red-03 text-sm">
          {t("climatePipeline.error", { error })}
        </p>
      ) : plans.length === 0 ? (
        <p className="text-gray-02 text-sm">{t("climatePipeline.empty")}</p>
      ) : (
        <div className="space-y-3">
          {/* A poll failure while we still have a last-known-good payload
              shouldn't blank the swimlane — just flag it non-blockingly.
              With a 5s poll interval, a transient network blip would
              otherwise hide working data on every hiccup. */}
          {error && (
            <p className="text-orange-03 text-xs">
              {t("climatePipeline.pollError", { error })}
            </p>
          )}
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onStepClick={handleStepClick}
              onPdfJobClick={setPdfJob}
            />
          ))}
        </div>
      )}

      <StepResultDialog
        plan={dialogPlan}
        step={dialogStep}
        runId={dialogRunId}
        open={dialogPlan !== null && dialogStep !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogPlanId(null);
            setDialogStep(null);
            setDialogRunId(null);
          }
        }}
        onRerun={refresh}
      />

      <JobDetailsDialog
        job={pdfJob}
        isOpen={pdfJob !== null}
        onOpenChange={(open) => {
          if (!open) setPdfJob(null);
        }}
      />
    </div>
  );
}
