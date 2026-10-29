import { MethodologyPanel } from "./MethodologyPanel";
import type { ExploreMunicipalityRecord } from "../lib/explore-types";

export function PlanAnatomyView({
  records,
}: {
  records: ExploreMunicipalityRecord[];
}) {
  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="Live climate-plans-pipeline plan detail (commitments, markdown length) plus municipality-sources (plan name, URL, adopted year, county)."
        calculation="No derived score — reading table for pipeline coverage: extracted / climate-relevant / similar-group counts and markdown length once a plan has been parsed."
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
                <th className="px-3 py-2 font-medium">Adopted</th>
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
                    {row.sourceUrl ? (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-03 hover:underline"
                      >
                        Source PDF
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-gray-02 tabular-nums whitespace-nowrap">
                    {row.adoptedYear ?? "—"}
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
    </div>
  );
}
