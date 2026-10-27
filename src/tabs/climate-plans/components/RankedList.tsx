import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionCard,
  SectionCardHeader,
  SectionCardBody,
} from "@/ui/section-card";
import type { Measure } from "../lib/measures-types";
import { MeasureCard } from "./MeasureCard";
import {
  scoreBarClasses,
  scoreClasses,
  type MeasureDimension,
} from "./measure-score-ui";

type SortDir = "asc" | "desc";

export function ScoreDistribution({
  measures,
  dimension,
}: {
  measures: Measure[];
  dimension: MeasureDimension;
}) {
  const counts = useMemo(() => {
    const c = new Array(7).fill(0);
    for (const m of measures) {
      const s =
        dimension === "activity"
          ? m.activity_shift_score
          : m.intervention_score;
      c[Math.min(Math.max(s, 1), 7) - 1]++;
    }
    return c;
  }, [measures, dimension]);

  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-1.5 h-10">
      {counts.map((count, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1 flex-1"
          title={`Score ${i + 1}: ${count} measure${count !== 1 ? "s" : ""}`}
        >
          <div
            className={cn("w-full rounded-sm", scoreBarClasses(i + 1))}
            style={{
              height: `${Math.max((count / max) * 32, count > 0 ? 4 : 0)}px`,
            }}
          />
          <span className="text-xs text-gray-02/50 tabular-nums">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

export function RankedList({
  title,
  subtitle,
  measures,
  dimension,
  defaultSort,
}: {
  title: string;
  subtitle: string;
  measures: Measure[];
  dimension: MeasureDimension;
  defaultSort: SortDir;
}) {
  const [sortDir, setSortDir] = useState<SortDir>(defaultSort);

  const sorted = useMemo(() => {
    const key =
      dimension === "activity" ? "activity_shift_score" : "intervention_score";
    return [...measures].sort((a, b) =>
      sortDir === "desc" ? b[key] - a[key] : a[key] - b[key],
    );
  }, [measures, dimension, sortDir]);

  const avg =
    measures.reduce(
      (s, m) =>
        s +
        (dimension === "activity"
          ? m.activity_shift_score
          : m.intervention_score),
      0,
    ) / (measures.length || 1);

  return (
    <SectionCard>
      <SectionCardHeader
        title={<span className="text-base font-semibold">{title}</span>}
        subtitle={subtitle}
        right={
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-02">
              avg{" "}
              <span
                className={cn(
                  "font-bold tabular-nums",
                  scoreClasses(Math.round(avg)),
                )}
              >
                {avg.toFixed(1)}
              </span>
            </span>
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="flex items-center gap-1.5 text-sm text-gray-02 hover:text-gray-01 transition-colors px-2.5 py-1.5 rounded border border-gray-03/30 hover:border-gray-03/50"
            >
              {sortDir === "desc" ? (
                <ArrowDown className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              {sortDir === "desc" ? "Best first" : "Worst first"}
            </button>
          </div>
        }
      />
      <SectionCardBody className="p-4 space-y-3">
        {sorted.map((measure, i) => (
          <MeasureCard
            key={`${measure.measure_text.slice(0, 20)}-${i}`}
            measure={measure}
            dimension={dimension}
            rank={i + 1}
          />
        ))}
      </SectionCardBody>
    </SectionCard>
  );
}
