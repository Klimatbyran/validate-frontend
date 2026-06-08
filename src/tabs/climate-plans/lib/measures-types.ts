export interface TransitionElementCandidate {
  stable_id: string
  short_label: string
  description: string
  sector_path: string
  score: number
}

export interface TransitionElementSuggestedNew {
  short_label: string
  description: string
}

export interface ActivityShift {
  activity: string
  shift_from: string
  shift_to: string
  need: string
  type: string
  type_reasoning: string
  score: number
  reasoning: string
  transition_element_matches: TransitionElementCandidate[]
  transition_element_candidates: TransitionElementCandidate[]
  transition_element_suggested_new?: TransitionElementSuggestedNew
}

export interface Measure {
  measure_text: string
  activity: string
  activity_shift_score: number
  activity_shifts: ActivityShift[]
  intervention_who: string
  intervention_when: string
  intervention_what: string
  intervention_how: string
  intervention_score: number
  intervention_reasoning: string
  intervention_type: string
}

export interface MunicipalityMeasures {
  id: string
  name: string
  measures: Measure[]
}

export interface MeasuresIndexEntry {
  id: string
  name: string
  file: string
}

export interface MeasuresIndex {
  municipalities: MeasuresIndexEntry[]
}
