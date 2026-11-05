import { ReviewControls } from "./ReviewControls";
import { measureEntityId } from "../lib/stepReviewEntities";
import { reviewKey } from "../hooks/usePipelineReviews";
import type { ExtractedMeasure } from "../hooks/useClimatePlanDetail";
import type { ReviewContext } from "./reviewContext";
import { MetaChip, QaFooter, ScoreChip } from "./stepResultListUi";

export function MeasuresList({
  measures,
  columns,
  reviewCtx,
}: {
  measures: ExtractedMeasure[];
  columns: "extract" | "score";
  reviewCtx: ReviewContext;
}) {
  if (measures.length === 0) {
    return <p className="text-sm text-gray-02">No measures yet.</p>;
  }
  return (
    <div className="space-y-3">
      {measures.map((m) => {
        const entityKey = reviewKey(
          reviewCtx.step,
          "measure",
          measureEntityId(m),
        );
        const snapshot =
          columns === "extract"
            ? {
                measureText: m.measureText,
                climateRelevanceScore: m.climateRelevanceScore,
              }
            : {
                measureText: m.measureText,
                activityShiftScore: m.score?.activityShiftScore ?? null,
                interventionScore: m.score?.interventionScore ?? null,
                interventionType: m.score?.interventionType ?? null,
              };
        return (
          <article
            key={m.id}
            className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              {columns === "extract" && (
                <MetaChip label="Relevance" tone="relevance">
                  {m.climateRelevanceScore}
                </MetaChip>
              )}
              {columns === "score" && (
                <>
                  <ScoreChip
                    label="Activity shift"
                    score={m.score?.activityShiftScore}
                  />
                  <ScoreChip
                    label="Intervention"
                    score={m.score?.interventionScore}
                  />
                  <MetaChip label="Type" tone="type">
                    {m.score?.interventionType ?? "—"}
                  </MetaChip>
                </>
              )}
            </div>
            <p className="text-sm text-gray-01 break-words whitespace-pre-wrap">
              {m.measureText}
            </p>
            <QaFooter>
              <ReviewControls
                planId={reviewCtx.planId}
                step={reviewCtx.step}
                entityType="measure"
                entityId={measureEntityId(m)}
                reviewedSnapshot={snapshot}
                review={reviewCtx.reviewsByEntity.get(entityKey)}
                defaultSuggestedValue={snapshot}
                onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
              />
            </QaFooter>
          </article>
        );
      })}
    </div>
  );
}
