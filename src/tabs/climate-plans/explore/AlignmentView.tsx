import { MethodologyPanel } from "./MethodologyPanel";
import {
  alignmentRows,
  findSectorEmissions,
  misalignmentScore,
} from "../lib/explore-alignment";
import { EMISSION_BUCKET_LABEL } from "../lib/tef-groups";
import type { EmissionsYearMode, ExploreDataset } from "../lib/explore-types";
import { namesMatch } from "../lib/municipality-names";
import { cn } from "@/lib/utils";

export function AlignmentView({
  dataset,
  selectedName,
  onSelectName,
  yearMode,
  onYearModeChange,
}: {
  dataset: ExploreDataset;
  selectedName: string | null;
  onSelectName: (name: string) => void;
  yearMode: EmissionsYearMode;
  onYearModeChange: (mode: EmissionsYearMode) => void;
}) {
  const selected =
    dataset.municipalities.find((row) =>
      namesMatch(row.name, selectedName ?? ""),
    ) ??
    dataset.municipalities.find(
      (row) => row.tefHits.length > 0 || row.goals.length > 0,
    ) ??
    dataset.municipalities[0] ??
    null;
  const emissions = selected
    ? findSectorEmissions(dataset.sectorEmissions, selected.name)
    : undefined;
  const aligned = selected
    ? alignmentRows(selected, emissions, yearMode)
    : { year: null, rows: [], note: "" };
  const score = misalignmentScore(aligned.rows);

  return (
    <div className="space-y-4">
      <MethodologyPanel
        data="Territorial sector totals from Unearth GET /municipalities/:name/sector-emissions (SMHI Nationella emissionsdatabasen via Klimatkollen). TEF hits from scored measures (sector_path → bucket)."
        calculation="For a chosen year, each SMHI sector maps to a bucket (transport, industry, energy, …). TEF hits map the same way via the first sector_path segment. Shares = bucket / total. Gap = TEF share − emission share. Misalignment score = Σ|gap| / 2 (0 = identical mix, 1 = completely different)."
        extra="Plans written against municipal operations (scope 1+2) will look 'misaligned' versus territorial SMHI data — that mismatch is itself a story. Use plan-year vs latest to see whether the comparison should be 'what they faced when writing' or 'what they face now'."
      />
      {dataset.sectorEmissionsError ? (
        <p className="text-sm text-orange-03">
          Sector emissions did not load ({dataset.sectorEmissionsError}).
          Alignment still shows TEF shares; emission bars stay empty until
          Unearth is reachable with a key.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selected?.name ?? ""}
          onChange={(e) => onSelectName(e.target.value)}
          className="text-sm bg-gray-04 border border-gray-03/50 text-gray-01 rounded px-3 py-2"
        >
          {dataset.municipalities.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-gray-03/40 text-sm">
          {(
            [
              ["latest", "Latest emissions"],
              ["plan", "Plan-year emissions"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onYearModeChange(mode)}
              className={cn(
                "px-3 py-2",
                yearMode === mode
                  ? "bg-gray-03/50 text-gray-01"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {score != null ? (
          <span className="text-sm text-gray-02">
            Mix mismatch{" "}
            <span className="font-semibold text-gray-01 tabular-nums">
              {(score * 100).toFixed(0)}%
            </span>
          </span>
        ) : null}
      </div>

      {selected ? (
        <div className="rounded-lg border border-gray-03/30 bg-gray-04/50 p-4 space-y-4">
          <div>
            <div className="text-base font-semibold text-gray-01">
              {selected.name}
            </div>
            <p className="text-xs text-gray-02 mt-1">{aligned.note}</p>
          </div>
          {aligned.rows.length === 0 ? (
            <p className="text-sm text-gray-02 italic">
              Need both TEF matches and sector emissions to draw this
              comparison.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3 text-[11px] text-gray-02">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-orange-03/80" />{" "}
                  territorial emissions
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-blue-03/80" /> TEF hits
                  in the plan
                </span>
              </div>
              {aligned.rows.map((row) => (
                <div key={row.bucket} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-01">
                      {EMISSION_BUCKET_LABEL[row.bucket]}
                    </span>
                    <span className="tabular-nums text-gray-02">
                      emissions {(row.emissionShare * 100).toFixed(0)}% · TEFs{" "}
                      {(row.tefShare * 100).toFixed(0)}%
                    </span>
                  </div>
                  <DualBar emission={row.emissionShare} tef={row.tefShare} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DualBar({ emission, tef }: { emission: number; tef: number }) {
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-gray-03/30">
        <div
          className="h-2 rounded-full bg-orange-03/80"
          style={{ width: `${Math.round(emission * 100)}%` }}
        />
      </div>
      <div className="h-2 rounded-full bg-gray-03/30">
        <div
          className="h-2 rounded-full bg-blue-03/80"
          style={{ width: `${Math.round(tef * 100)}%` }}
        />
      </div>
    </div>
  );
}
