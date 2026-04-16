export type VerificationStatus = "correct" | "incorrect" | "unreviewed";

export interface VerificationRecord {
  status: VerificationStatus;
  /** Back-compat for earlier drafts */
  correctedCategory?: string;
  /** For `measures[]` verification */
  correctedMeasureType?: string;
  /** Outcome subtype (Lovable: overall/sectorial) */
  correctedOutcomeType?: "overall" | "sectorial";
  /** Activity shift subtype (from `activity_shift_type`) */
  correctedActivityShiftType?: string;
  correctedClimateRelevance?: string;
  correctedSector?: string;
  correctedInstrumentType?: string;
  /** For plan period verification */
  correctedPlanPeriodStart?: string;
  correctedPlanPeriodEnd?: string;
  comment?: string;
}

export interface MunicipalityVerificationState {
  version: 1;
  updatedAt: string; // ISO
  items: Record<string, VerificationRecord>;
}

export interface VerificationCounts {
  outcomes: number;
  activityShifts: number;
  interventions: number;
}

export interface MunicipalityVerificationSummary {
  total: number;
  reviewed: number;
  correct: number;
  incorrect: number;
  counts: VerificationCounts;
}

