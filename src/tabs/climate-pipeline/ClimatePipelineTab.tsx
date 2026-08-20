import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { StatusPill } from "@/components/StatusPill";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import {
  useClimatePipelinePlans,
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "./hooks/useClimatePipelinePlans";
import { StepResultDialog } from "./components/StepResultDialog";

const LATEST_RUN = "latest";

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
  onStepClick: (plan: ClimatePipelinePlan, step: string) => void;
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

function PlanRow({ plan, onStepClick }: PlanRowProps) {
  const [selectedRunId, setSelectedRunId] = useState<string>(LATEST_RUN);

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
  // upload or rerun) — group by that to offer "view this past run as a
  // whole swimlane" instead of only per-step history. Rows from before
  // runId existed have no group and are excluded from the picker.
  const byRunId = new Map<string, PipelineStepRun[]>();
  for (const s of plan.pipelineSteps) {
    if (!s.runId) continue;
    const list = byRunId.get(s.runId) ?? [];
    list.push(s);
    byRunId.set(s.runId, list);
  }
  const runOptions = [...byRunId.entries()].sort(
    ([, a], [, b]) =>
      new Date(b[0].startedAt).getTime() - new Date(a[0].startedAt).getTime(),
  );

  const viewingRunsByStep = (() => {
    if (selectedRunId === LATEST_RUN) return runsByStep;
    const rows = byRunId.get(selectedRunId) ?? [];
    const map = new Map<string, PipelineStepRun[]>();
    for (const r of rows) map.set(r.step, [r]);
    return map;
  })();

  const name =
    plan.municipality?.name ?? plan.extractedMunicipalityName ?? plan.url;

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-01 truncate">{name}</h3>
          <p className="text-xs text-gray-02 truncate">{plan.url}</p>
        </div>
        {runOptions.length > 1 && (
          <SingleSelectDropdown
            options={[LATEST_RUN, ...runOptions.map(([id]) => id)]}
            value={selectedRunId}
            onChange={setSelectedRunId}
            getOptionLabel={(id) =>
              id === LATEST_RUN ? "Latest" : formatRunLabel(byRunId.get(id) ?? [])
            }
            triggerClassName="h-7 text-xs px-2"
          />
        )}
        <span className="text-xs text-gray-02 shrink-0">{plan.status}</span>
      </div>
      {selectedRunId !== LATEST_RUN && (
        <p className="text-xs text-blue-03">
          Viewing a past run — step status/timing only; commitment and
          measure content below always reflects the current data.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COMMITMENT_STEPS.map((step) => (
          <StepStatusPill
            key={step}
            step={step}
            run={viewingRunsByStep.get(step)?.[0]}
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
            run={viewingRunsByStep.get(step)?.[0]}
            isRerun={(runsByStep.get(step)?.length ?? 0) > 1}
            onClick={() => onStepClick(plan, step)}
          />
        ))}
      </div>
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
  const dialogPlan = plans.find((p) => p.id === dialogPlanId) ?? null;

  const handleStepClick = (plan: ClimatePipelinePlan, step: string) => {
    setDialogPlanId(plan.id);
    setDialogStep(step);
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
      ) : error ? (
        <p className="text-red-03 text-sm">
          {t("climatePipeline.error", { error })}
        </p>
      ) : plans.length === 0 ? (
        <p className="text-gray-02 text-sm">{t("climatePipeline.empty")}</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onStepClick={handleStepClick} />
          ))}
        </div>
      )}

      <StepResultDialog
        plan={dialogPlan}
        step={dialogStep}
        open={dialogPlan !== null && dialogStep !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogPlanId(null);
            setDialogStep(null);
          }
        }}
        onRerun={refresh}
      />
    </div>
  );
}
