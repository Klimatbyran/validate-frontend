export interface TransitionElementCandidate {
  stable_id: string;
  short_label: string;
  description: string;
  sector_path: string;
  score: number;
}

export type MatchConfidence = "high" | "mid" | "low";

export interface TransitionElementMatch {
  stable_id: string;
  short_label: string;
  description: string;
  sector_path: string;
  match_confidence: MatchConfidence;
  /** LLM judgment: measure text directly names this match. Undefined on older data. */
  explicit?: boolean;
}

export interface TransitionElementSuggestedNew {
  short_label: string;
  description: string;
}

export interface ActivityShift {
  activity: string;
  shift_from: string;
  shift_to: string;
  need: string;
  type: string;
  type_reasoning: string;
  score: number;
  reasoning: string;
  transition_element_matches: TransitionElementMatch[];
  transition_element_candidates: TransitionElementCandidate[];
  transition_element_suggested_new?: TransitionElementSuggestedNew;
  /** LLM-classified TEF top domain (pipeline only), e.g. "Waste" or "T-6". */
  transition_element_gate_domain?: string | null;
  /** Present when matchTransitionElements attached a shadow TEF gap. */
  shadow_element_id?: string | null;
  /** Shadow taxonomy status when shadow_element_id is set. */
  shadow_element_status?: string | null;
}

export interface Measure {
  measure_text: string;
  activity: string;
  activity_shift_score: number;
  activity_shifts: ActivityShift[];
  intervention_who: string;
  intervention_when: string;
  intervention_what: string;
  intervention_how: string;
  intervention_score: number;
  intervention_reasoning: string;
  intervention_type: string;
}

export interface MunicipalityMeasures {
  id: string;
  name: string;
  measures: Measure[];
}

export interface MeasuresIndexEntry {
  id: string;
  name: string;
  file: string;
}

export interface MeasuresIndex {
  municipalities: MeasuresIndexEntry[];
}
