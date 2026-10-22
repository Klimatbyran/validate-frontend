import { MethodologyPanel } from "./MethodologyPanel";
import type { ExploreMunicipalityRecord } from "../lib/explore-types";

export function PlanAnatomyView({
  records,
}: {
  records: ExploreMunicipalityRecord[];
}) {
  const withScope = records.filter(
    (r) => r.documentTitle || r.primaryFocus || r.planPeriodStart,
  );

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="plan_scope_*.json (document type, period, mitigation vs adaptation) plus municipality-sources (URL, adopted year) and pipeline markdown length. Extracted / climate / groups are pipeline commitment counts (all unique texts, climateRelevant === true, then similar-groups after climate+actionable)."
        calculation="No derived score — this is a reading table so we can see which extracts are strategies vs action plans, how long the source is, and whether Paris / quantified targets landed in emission_targets."
      />
      {records.length === 0 ? (
        <p className="text-sm text-gray-02">Nothing loaded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-03/30">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-03/40 text-left text-gray-02">
                <th className="px-3 py-2 font-medium">Municipality</th>
                <th className="px-3 py-2 font-medium">Document</th>
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium">Focus</th>
                <th className="px-3 py-2 font-medium">Paris</th>
                <th className="px-3 py-2 font-medium">Quantified</th>
                <th className="px-3 py-2 font-medium">Extracted</th>
                <th className="px-3 py-2 font-medium">Climate</th>
                <th className="px-3 py-2 font-medium">Groups</th>
                <th className="px-3 py-2 font-medium">Length</th>
                <th className="px-3 py-2 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-b border-gray-03/20">
                  <td className="px-3 py-2 text-gray-01 whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-gray-01">
                    <div>{row.documentTitle ?? "—"}</div>
                    <div className="text-xs text-gray-02">
                      {row.documentType ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-02 tabular-nums whitespace-nowrap">
                    {row.planPeriodStart || row.planPeriodEnd
                      ? `${row.planPeriodStart ?? "?"}–${row.planPeriodEnd ?? "?"}`
                      : (row.adoptedYear ?? "—")}
                  </td>
                  <td className="px-3 py-2 text-gray-02">
                    {row.primaryFocus ?? "—"}
                  </td>
                  <td className="px-3 py-2">{boolCell(row.parisMentioned)}</td>
                  <td className="px-3 py-2">
                    {boolCell(row.hasQuantifiedTargets)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-01">
                    {row.commitmentCount}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-01">
                    {row.climateRelevantCommitmentCount ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-01">
                    {row.climateCommitmentGroupCount ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-02">
                    {row.markdownChars == null
                      ? "—"
                      : `~${Math.max(1, Math.round(row.markdownChars / 3000))} p.`}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-02 max-w-xs">
                    {row.dataSources.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {withScope.length === 0 ? (
        <p className="text-xs text-gray-02">
          Plan-scope JSON is only present for the early Jönköping-län extracts.
          Pipeline markdown length appears once a plan has been parsed.
        </p>
      ) : null}
    </div>
  );
}

function boolCell(value: boolean | null) {
  if (value == null) return <span className="text-gray-03">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "yes" : "no"}
    </span>
  );
}
