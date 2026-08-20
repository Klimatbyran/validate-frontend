import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { StatusPill } from "@/components/StatusPill";
import {
  useClimatePipelinePlans,
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "./hooks/useClimatePipelinePlans";
import { StepResultDialog } from "./components/StepResultDialog";

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
  "filterMeasuresResource",
  "scoreMeasures",
] as const;

interface PlanRowProps {
  plan: ClimatePipelinePlan;
  onStepClick: (plan: ClimatePipelinePlan, step: string) => void;
}

function StepStatusPill({
  step,
  run,
  onClick,
}: {
  step: string;
  run?: PipelineStepRun;
  onClick: () => void;
}) {
  return (
    <StatusPill
      label={step}
      status={toSwimlaneStatus(run?.status)}
      isActive={run?.status === "running"}
      jobExists={run !== undefined}
      onClick={onClick}
    />
  );
}

function PlanRow({ plan, onStepClick }: PlanRowProps) {
  const stepByName = new Map(plan.pipelineSteps.map((s) => [s.step, s]));
  const name =
    plan.municipality?.name ?? plan.extractedMunicipalityName ?? plan.url;
  const hasMeasureActivity = MEASURE_STEPS.some((s) => stepByName.has(s));

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-01 truncate">{name}</h3>
          <p className="text-xs text-gray-02 truncate">{plan.url}</p>
        </div>
        <span className="text-xs text-gray-02 shrink-0">{plan.status}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMMITMENT_STEPS.map((step) => (
          <StepStatusPill
            key={step}
            step={step}
            run={stepByName.get(step)}
            onClick={() => onStepClick(plan, step)}
          />
        ))}
      </div>
      {hasMeasureActivity && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-03/50">
          {MEASURE_STEPS.map((step) => (
            <StepStatusPill
              key={step}
              step={step}
              run={stepByName.get(step)}
              onClick={() => onStepClick(plan, step)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClimatePipelineTab() {
  const { t } = useI18n();
  const { plans, isLoading, error, refresh } = useClimatePipelinePlans();
  const [dialogPlan, setDialogPlan] = useState<ClimatePipelinePlan | null>(
    null,
  );
  const [dialogStep, setDialogStep] = useState<string | null>(null);

  const handleStepClick = (plan: ClimatePipelinePlan, step: string) => {
    setDialogPlan(plan);
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
            setDialogPlan(null);
            setDialogStep(null);
          }
        }}
      />
    </div>
  );
}
