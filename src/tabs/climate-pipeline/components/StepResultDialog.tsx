import { useState } from "react";
import { Loader2, ChevronsDown, ChevronsUp, RotateCw } from "lucide-react";
import { Modal } from "@/ui/modal";
import { Button } from "@/ui/button";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import {
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableBody,
} from "@/ui/data-table";
import { StatusPill } from "@/components/StatusPill";
import {
  toSwimlaneStatus,
  type ClimatePipelinePlan,
  type PipelineStepRun,
} from "../hooks/useClimatePipelinePlans";
import {
  useClimatePlanDetail,
  type Commitment,
  type ExtractedMeasure,
  type ClimatePlanDetail,
} from "../hooks/useClimatePlanDetail";

/** Count of items shown in each step's dialog — same filters the dialog
 * content itself applies, so the title badge always matches what's below. */
function getStepItemCount(step: string, detail: ClimatePlanDetail): number | null {
  switch (step) {
    case "extractCommitments":
      return detail.commitments.length;
    case "filterCommitmentsClimate":
      return detail.commitments.filter((c) => c.climateRelevant).length;
    case "filterCommitmentsActionable":
    case "groupCommitmentsSimilar":
    case "groupCommitmentsThemes":
      return detail.commitments.filter((c) => c.climateRelevant && c.actionable).length;
    case "extractMeasures":
      return detail.extractedMeasures.length;
    case "scoreMeasures":
      return detail.extractedMeasures.filter((m) => m.score).length;
    case "matchTransitionElements":
      return detail.extractedMeasures.filter(
        (m) => m.score && m.score.activityShifts.length > 0,
      ).length;
    default:
      return null;
  }
}

function TransitionElementsView({ measures }: { measures: ExtractedMeasure[] }) {
  const withShifts = measures.filter((m) => m.score && m.score.activityShifts.length > 0);
  if (withShifts.length === 0) {
    return <p className="text-sm text-gray-02">No activity shifts to match yet.</p>;
  }
  return (
    <div className="space-y-4">
      {withShifts.map((m) => (
        <div key={m.id} className="bg-gray-03/30 rounded-lg p-3 space-y-3">
          <p className="text-sm text-gray-01">
            <WrappedText text={m.measureText} width="max-w-2xl" />
          </p>
          {m.score!.activityShifts.map((shift) => (
            <div key={shift.id} className="pl-3 border-l-2 border-gray-03 space-y-1">
              <p className="text-xs text-gray-02">
                <span className="font-medium">{shift.type}</span>: {shift.shiftFrom} →{" "}
                {shift.shiftTo}{" "}
                <span className="text-gray-02/70">(need: {shift.need})</span>
              </p>
              {shift.transitionElementMatches.length === 0 ? (
                <p className="text-xs text-gray-02 italic">No matches</p>
              ) : (
                <ul className="text-xs space-y-0.5">
                  {shift.transitionElementMatches.map((match) => (
                    <li key={match.stableId} className="text-gray-01">
                      <span
                        className={
                          match.matchConfidence === "high"
                            ? "text-green-03"
                            : match.matchConfidence === "mid"
                              ? "text-blue-03"
                              : "text-gray-02"
                        }
                      >
                        {match.shortLabel}
                      </span>{" "}
                      <span className="text-gray-02">
                        ({match.matchConfidence}, {match.score.toFixed(2)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PreviousStepRuns({ runs }: { runs: PipelineStepRun[] }) {
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

function RerunButton({
  planId,
  step,
  onRerun,
}: {
  planId: string;
  step: string;
  onRerun: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${getClimatePlansPipelineApiUrl()}/plans/${planId}/rerun/${step}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      onRerun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rerun");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className="h-7 px-3 text-xs"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        ) : (
          <RotateCw className="w-3 h-3 mr-1.5" />
        )}
        Rerun from here
      </Button>
      {error && <span className="text-xs text-pink-03">{error}</span>}
    </div>
  );
}

interface StepResultDialogProps {
  plan: ClimatePipelinePlan | null;
  step: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRerun?: () => void;
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-02">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function WrappedText({ text, width = "max-w-md" }: { text: string; width?: string }) {
  return (
    <span className={`block whitespace-pre-wrap break-words ${width}`}>
      {text}
    </span>
  );
}

function CommitmentsTable({
  commitments,
  columns,
}: {
  commitments: Commitment[];
  columns: "extract" | "climate" | "actionable" | "similar" | "themes";
}) {
  if (commitments.length === 0) {
    return <p className="text-sm text-gray-02">No commitments yet.</p>;
  }

  if (columns === "similar") {
    const groups = new Map<string, Commitment[]>();
    const singletons: Commitment[] = [];
    for (const c of commitments) {
      if (c.similarGroupId) {
        const list = groups.get(c.similarGroupId) ?? [];
        list.push(c);
        groups.set(c.similarGroupId, list);
      } else {
        singletons.push(c);
      }
    }
    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-02">
          {groups.size} duplicate group(s), {singletons.length} unique commitment(s)
        </p>
        {[...groups.entries()].map(([groupId, members]) => (
          <div key={groupId} className="bg-gray-03/30 rounded-lg p-3 space-y-1">
            {members.map((c) => (
              <p key={c.id} className="text-sm text-gray-01">
                <span className="text-gray-02 font-mono text-xs mr-2">{c.stableId}</span>
                {c.text}
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (columns === "themes") {
    const byTheme = new Map<string, Commitment[]>();
    for (const c of commitments) {
      const key = c.theme ?? "(none)";
      const list = byTheme.get(key) ?? [];
      list.push(c);
      byTheme.set(key, list);
    }
    return (
      <div className="space-y-4">
        {[...byTheme.entries()].map(([theme, members]) => (
          <div key={theme}>
            <p className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-1">
              {theme} ({members.length})
            </p>
            <div className="bg-gray-03/30 rounded-lg p-3 space-y-1">
              {members.map((c) => (
                <p key={c.id} className="text-sm text-gray-01">
                  <span className="text-gray-02 font-mono text-xs mr-2">{c.stableId}</span>
                  {c.text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Text</th>
            {columns === "climate" && (
              <>
                <th className="px-3 py-2">Climate relevant</th>
                <th className="px-3 py-2">Adaptation</th>
                <th className="px-3 py-2">Reason</th>
              </>
            )}
            {columns === "actionable" && (
              <>
                <th className="px-3 py-2">Actionable</th>
                <th className="px-3 py-2">Reason</th>
              </>
            )}
            {columns === "extract" && (
              <>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Unverified</th>
              </>
            )}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {commitments.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 font-mono text-xs text-gray-02">{c.stableId}</td>
              <td className="px-3 py-2">
                <WrappedText text={c.text} />
              </td>
              {columns === "climate" && (
                <>
                  <td className="px-3 py-2">
                    <YesNo value={c.climateRelevant} />
                  </td>
                  <td className="px-3 py-2">
                    <YesNo value={c.adaptation} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <WrappedText text={c.climateFilterReason ?? ""} width="max-w-xs" />
                  </td>
                </>
              )}
              {columns === "actionable" && (
                <>
                  <td className="px-3 py-2">
                    <YesNo value={c.actionable} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <WrappedText text={c.actionableReason ?? ""} width="max-w-xs" />
                  </td>
                </>
              )}
              {columns === "extract" && (
                <>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <WrappedText text={c.section} width="max-w-[10rem]" />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">{c.type}</td>
                  <td className="px-3 py-2">
                    <YesNo value={c.unverified} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
    </DataTableShell>
  );
}

function MeasuresTable({
  measures,
  columns,
}: {
  measures: ExtractedMeasure[];
  columns: "extract" | "score";
}) {
  if (measures.length === 0) {
    return <p className="text-sm text-gray-02">No measures yet.</p>;
  }
  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className="px-3 py-2">Measure</th>
            {columns === "extract" && <th className="px-3 py-2">Relevance</th>}
            {columns === "score" && (
              <>
                <th className="px-3 py-2">Activity shift</th>
                <th className="px-3 py-2">Intervention</th>
                <th className="px-3 py-2">Type</th>
              </>
            )}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {measures.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2">
                <WrappedText text={m.measureText} />
              </td>
              {columns === "extract" && (
                <td className="px-3 py-2 text-xs text-gray-02">{m.climateRelevanceScore}</td>
              )}
              {columns === "score" && (
                <>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    {m.score?.activityShiftScore ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    {m.score?.interventionScore ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    {m.score?.interventionType ?? "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
    </DataTableShell>
  );
}

export function StepResultDialog({
  plan,
  step,
  open,
  onOpenChange,
  onRerun,
}: StepResultDialogProps) {
  const { detail, isLoading, error, refresh } = useClimatePlanDetail(
    open ? (plan?.id ?? null) : null,
  );

  if (!plan || !step) return null;

  // pipelineSteps is ordered newest-first, so the first match for this step
  // is its latest run — everything after that is history.
  const stepRuns = plan.pipelineSteps.filter((s) => s.step === step);
  const run = stepRuns[0];
  const previousRuns = stepRuns.slice(1);
  const itemCount = detail ? getStepItemCount(step, detail) : null;

  const content = (() => {
    if (isLoading || !detail) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-pink-03">Could not load: {error}</p>;
    }

    switch (step) {
      case "extractMunicipality":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-02">Extracted name: </span>
              <span className="text-gray-01">
                {detail.extractedMunicipalityName ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-gray-02">Approved municipality: </span>
              <span className="text-gray-01">
                {detail.municipality?.name ?? "(not yet approved)"}
              </span>
            </p>
          </div>
        );
      case "extractCommitments":
        return <CommitmentsTable commitments={detail.commitments} columns="extract" />;
      case "filterCommitmentsClimate":
        return <CommitmentsTable commitments={detail.commitments} columns="climate" />;
      case "filterCommitmentsActionable":
        return (
          <CommitmentsTable
            commitments={detail.commitments.filter((c) => c.climateRelevant)}
            columns="actionable"
          />
        );
      case "groupCommitmentsSimilar":
        return (
          <CommitmentsTable
            commitments={detail.commitments.filter((c) => c.climateRelevant && c.actionable)}
            columns="similar"
          />
        );
      case "groupCommitmentsThemes":
        return (
          <CommitmentsTable
            commitments={detail.commitments.filter((c) => c.climateRelevant && c.actionable)}
            columns="themes"
          />
        );
      case "extractMeasures":
        return <MeasuresTable measures={detail.extractedMeasures} columns="extract" />;
      case "scoreMeasures":
        return <MeasuresTable measures={detail.extractedMeasures} columns="score" />;
      case "matchTransitionElements":
        return <TransitionElementsView measures={detail.extractedMeasures} />;
      default:
        return <p className="text-sm text-gray-02">No details for this step.</p>;
    }
  })();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="3xl"
      scrollable
      title={
        <div className="flex items-center gap-3">
          <span>{step}</span>
          {itemCount !== null && (
            <span className="text-xs font-normal text-gray-02">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          )}
          <StatusPill
            label={run?.status ?? "pending"}
            status={toSwimlaneStatus(run?.status)}
            isActive={run?.status === "running"}
          />
          <RerunButton
            planId={plan.id}
            step={step}
            onRerun={() => {
              refresh();
              onRerun?.();
            }}
          />
        </div>
      }
      description={
        run ? (
          <div>
            <span className="text-xs">
              Started {new Date(run.startedAt).toLocaleString()}
              {run.completedAt &&
                ` · finished ${new Date(run.completedAt).toLocaleString()}`}
              {run.error && (
                <span className="block text-pink-03 mt-1">{run.error}</span>
              )}
            </span>
            <PreviousStepRuns runs={previousRuns} />
          </div>
        ) : (
          "This step hasn't run yet."
        )
      }
    >
      <div className="mt-4">{content}</div>
    </Modal>
  );
}
