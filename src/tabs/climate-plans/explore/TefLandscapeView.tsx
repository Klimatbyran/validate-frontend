import { useMemo } from "react";
import { MethodologyPanel } from "./MethodologyPanel";
import { tefGroupStrengths } from "../lib/explore-aggregates";
import type { ExploreMunicipalityRecord } from "../lib/explore-types";
import { cn } from "@/lib/utils";

export function TefLandscapeView({
  records,
}: {
  records: ExploreMunicipalityRecord[];
}) {
  const matrix = useMemo(() => {
    const groupSet = new Set<string>();
    for (const record of records) {
      for (const hit of record.tefHits) groupSet.add(hit.group);
    }
    const groups = [...groupSet].sort((a, b) => a.localeCompare(b));
    const rows = records
      .filter((r) => r.tefHits.length > 0)
      .map((record) => {
        const strengths = new Map(
          tefGroupStrengths(record.tefHits).map((g) => [g.group, g]),
        );
        return { record, strengths };
      });
    return { groups, rows };
  }, [records]);

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="transition_element_matches on scored measures, grouped by sector_path's first segment."
        calculation="Cell colour = weighted strength (high=3, mid=2, low=1) / 3. Number = hit count. Empty cell = that municipality's plan never matched this TEF group."
      />
      {matrix.groups.length === 0 ? (
        <p className="text-sm text-gray-02">
          No TEF matches in the loaded extracts yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-03/30">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-03/40">
                <th className="text-left px-3 py-2 text-gray-02 font-medium sticky left-0 bg-gray-04">
                  Municipality
                </th>
                {matrix.groups.map((group) => (
                  <th
                    key={group}
                    className="px-2 py-2 text-gray-02 font-medium whitespace-nowrap"
                  >
                    {group}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map(({ record, strengths }) => (
                <tr key={record.id} className="border-b border-gray-03/20">
                  <td className="px-3 py-2 text-gray-01 sticky left-0 bg-gray-04 whitespace-nowrap">
                    {record.name}
                  </td>
                  {matrix.groups.map((group) => {
                    const cell = strengths.get(group);
                    const t = cell?.weightedStrength ?? 0;
                    return (
                      <td key={group} className="px-2 py-1.5 text-center">
                        {cell ? (
                          <span
                            className={cn(
                              "inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 tabular-nums text-xs font-medium",
                              t >= 0.66
                                ? "bg-green-03/25 text-green-03"
                                : t >= 0.4
                                  ? "bg-blue-03/20 text-blue-03"
                                  : "bg-orange-03/20 text-orange-03",
                            )}
                            title={`${cell.hitCount} hits, ${(t * 100).toFixed(0)}% high-weighted`}
                          >
                            {cell.hitCount}
                          </span>
                        ) : (
                          <span className="text-gray-03/60">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
