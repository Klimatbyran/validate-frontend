import { Loader2 } from "lucide-react";
import { Modal } from "@/ui/modal";
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
} from "../hooks/useClimatePipelinePlans";
import {
  useClimatePlanDetail,
  type Commitment,
  type ExtractedMeasure,
} from "../hooks/useClimatePlanDetail";

interface StepResultDialogProps {
  plan: ClimatePipelinePlan | null;
  step: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-02">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function TruncatedText({ text, width = "max-w-md" }: { text: string; width?: string }) {
  return (
    <span title={text} className={`block truncate ${width}`}>
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
                <TruncatedText text={c.text} />
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
                    <TruncatedText text={c.climateFilterReason ?? ""} width="max-w-xs" />
                  </td>
                </>
              )}
              {columns === "actionable" && (
                <>
                  <td className="px-3 py-2">
                    <YesNo value={c.actionable} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <TruncatedText text={c.actionableReason ?? ""} width="max-w-xs" />
                  </td>
                </>
              )}
              {columns === "extract" && (
                <>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <TruncatedText text={c.section} width="max-w-[10rem]" />
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
  columns: "extract" | "resource" | "score";
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
            {columns === "resource" && (
              <>
                <th className="px-3 py-2">Resource change</th>
                <th className="px-3 py-2">Reason</th>
              </>
            )}
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
                <TruncatedText text={m.measureText} />
              </td>
              {columns === "extract" && (
                <td className="px-3 py-2 text-xs text-gray-02">{m.climateRelevanceScore}</td>
              )}
              {columns === "resource" && (
                <>
                  <td className="px-3 py-2">
                    <YesNo value={m.resourceChange} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02">
                    <TruncatedText text={m.resourceChangeReason ?? ""} width="max-w-xs" />
                  </td>
                </>
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
}: StepResultDialogProps) {
  const { detail, isLoading, error } = useClimatePlanDetail(
    open ? (plan?.id ?? null) : null,
  );

  if (!plan || !step) return null;

  const run = plan.pipelineSteps.find((s) => s.step === step);

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
      case "filterMeasuresResource":
        return <MeasuresTable measures={detail.extractedMeasures} columns="resource" />;
      case "scoreMeasures":
        return (
          <MeasuresTable
            measures={detail.extractedMeasures.filter((m) => m.resourceChange)}
            columns="score"
          />
        );
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
          <StatusPill
            label={run?.status ?? "pending"}
            status={toSwimlaneStatus(run?.status)}
            isActive={run?.status === "running"}
          />
        </div>
      }
      description={
        run ? (
          <span className="text-xs">
            Started {new Date(run.startedAt).toLocaleString()}
            {run.completedAt &&
              ` · finished ${new Date(run.completedAt).toLocaleString()}`}
            {run.error && (
              <span className="block text-pink-03 mt-1">{run.error}</span>
            )}
          </span>
        ) : (
          "This step hasn't run yet."
        )
      }
    >
      <div className="mt-4">{content}</div>
    </Modal>
  );
}
