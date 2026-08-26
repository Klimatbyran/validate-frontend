// Bridges climate-plans-pipeline's live output into the same
// MunicipalityMeasures[] shape the static public/climate-plans/measures/*.json
// files use, so ClimatePlansExplorer renders both without any UI changes.

import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import type {
  Measure,
  ActivityShift,
  MunicipalityMeasures,
} from "./measures-types";

// ── Raw API response shapes (climate-plans-pipeline's GET /plans, /plans/:id) ──

interface ApiPipelineStepRun {
  step: string;
  status: "running" | "completed" | "failed";
}

interface ApiPlanListItem {
  id: string;
  municipality: { name: string } | null;
  extractedMunicipalityName: string | null;
  pipelineSteps: ApiPipelineStepRun[];
}

interface ApiTransitionElementMatch {
  stableId: string;
  shortLabel: string;
  description: string;
  sectorPath: string;
  score: number;
  matchConfidence: "high" | "mid" | "low";
}

interface ApiTransitionElementCandidate {
  stableId: string;
  shortLabel: string;
  description: string;
  sectorPath: string;
  score: number;
}

interface ApiActivityShift {
  activity: string;
  shiftFrom: string;
  shiftTo: string;
  need: string;
  type: string;
  typeReasoning: string;
  score: number;
  reasoning: string;
  transitionElementMatches: ApiTransitionElementMatch[];
  transitionElementCandidates: ApiTransitionElementCandidate[];
  transitionElementSuggestedNew?: {
    shortLabel: string;
    description: string;
  } | null;
}

interface ApiMeasureScore {
  activity: string;
  activityShiftScore: number;
  interventionWho: string;
  interventionWhen: string;
  interventionWhat: string;
  interventionHow: string;
  interventionScore: number;
  interventionReasoning: string;
  interventionType: string;
  activityShifts: ApiActivityShift[];
}

interface ApiExtractedMeasure {
  measureText: string;
  score: ApiMeasureScore | null;
}

interface ApiPlanDetail extends ApiPlanListItem {
  extractedMeasures: ApiExtractedMeasure[];
}

// Prisma's ScoreShiftType enum has no spaces (TypeShift); the explorer's UI
// (and the original prompt_score_v1.py output it was built around) expects
// the space-separated label ("Type Shift").
const SHIFT_TYPE_LABELS: Record<string, string> = {
  TypeShift: "Type Shift",
  ResourceShift: "Resource Shift",
  UtilisationShift: "Utilisation Shift",
  WorkEfficiencyShift: "Work Efficiency Shift",
  ResourceEfficiencyShift: "Resource Efficiency Shift",
  CarbonShift: "Carbon Shift",
};

function toExplorerShift(shift: ApiActivityShift): ActivityShift {
  return {
    activity: shift.activity,
    shift_from: shift.shiftFrom,
    shift_to: shift.shiftTo,
    need: shift.need,
    type: SHIFT_TYPE_LABELS[shift.type] ?? shift.type,
    type_reasoning: shift.typeReasoning,
    score: shift.score,
    reasoning: shift.reasoning,
    transition_element_matches: shift.transitionElementMatches.map((m) => ({
      stable_id: m.stableId,
      short_label: m.shortLabel,
      description: m.description,
      sector_path: m.sectorPath,
      match_confidence: m.matchConfidence,
    })),
    transition_element_candidates: shift.transitionElementCandidates.map(
      (c) => ({
        stable_id: c.stableId,
        short_label: c.shortLabel,
        description: c.description,
        sector_path: c.sectorPath,
        score: c.score,
      }),
    ),
    ...(shift.transitionElementSuggestedNew
      ? {
          transition_element_suggested_new: {
            short_label: shift.transitionElementSuggestedNew.shortLabel,
            description: shift.transitionElementSuggestedNew.description,
          },
        }
      : {}),
  };
}

function toExplorerMeasure(m: ApiExtractedMeasure): Measure {
  const score = m.score;
  return {
    measure_text: m.measureText,
    activity: score?.activity ?? "none",
    activity_shift_score: score?.activityShiftScore ?? 1,
    activity_shifts: (score?.activityShifts ?? []).map(toExplorerShift),
    intervention_who: score?.interventionWho ?? "none",
    intervention_when: score?.interventionWhen ?? "none",
    intervention_what: score?.interventionWhat ?? "none",
    intervention_how: score?.interventionHow ?? "none",
    intervention_score: score?.interventionScore ?? 1,
    intervention_reasoning: score?.interventionReasoning ?? "",
    intervention_type: score?.interventionType ?? "none",
  };
}

/** Fetches every plan that's been through scoreMeasures and returns them in
 * the same shape as the static measures JSON files. Returns [] (not a
 * thrown error) if the pipeline API is unreachable, so the static list
 * still renders on its own. */
export async function fetchPipelineMeasures(): Promise<MunicipalityMeasures[]> {
  const base = getClimatePlansPipelineApiUrl();
  try {
    const res = await fetch(`${base}/plans`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const plans = (await res.json()) as ApiPlanListItem[];

    const scored = plans.filter((p) =>
      p.pipelineSteps.some(
        (s) => s.step === "scoreMeasures" && s.status === "completed",
      ),
    );

    const details = await Promise.all(
      scored.map(async (p) => {
        const detailRes = await fetch(`${base}/plans/${p.id}`);
        if (!detailRes.ok) return null;
        return (await detailRes.json()) as ApiPlanDetail;
      }),
    );

    return details
      .filter((d): d is ApiPlanDetail => d !== null)
      .map((plan) => {
        const measures = plan.extractedMeasures
          .filter((m) => m.score !== null)
          .map(toExplorerMeasure);
        return {
          id: plan.id,
          name:
            plan.municipality?.name ??
            plan.extractedMunicipalityName ??
            plan.id,
          measures,
        };
      })
      .filter((m) => m.measures.length > 0);
  } catch (err) {
    console.warn(
      "[pipeline-measures] climate-plans-pipeline unreachable, showing static data only",
      err,
    );
    return [];
  }
}
