import { Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import {
  useClimatePipelinePlans,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "./hooks/useClimatePipelinePlans";

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

function StepPill({ step, run }: { step: string; run?: PipelineStepRun }) {
  const status = run?.status ?? "pending";
  return (
    <div
      title={run?.error ?? undefined}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border",
        status === "completed" &&
          "bg-green-03/20 border-green-03 text-green-03",
        status === "running" &&
          "bg-blue-03/20 border-blue-03 text-blue-03 animate-pulse",
        status === "failed" && "bg-red-03/20 border-red-03 text-red-03",
        status === "pending" && "bg-gray-03/50 border-gray-03 text-gray-02",
      )}
    >
      {step}
    </div>
  );
}

function PlanRow({ plan }: { plan: ClimatePipelinePlan }) {
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
          <StepPill key={step} step={step} run={stepByName.get(step)} />
        ))}
      </div>
      {hasMeasureActivity && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-03/50">
          {MEASURE_STEPS.map((step) => (
            <StepPill key={step} step={step} run={stepByName.get(step)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClimatePipelineTab() {
  const { t } = useI18n();
  const { plans, isLoading, error, refresh } = useClimatePipelinePlans();

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
            <PlanRow key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
