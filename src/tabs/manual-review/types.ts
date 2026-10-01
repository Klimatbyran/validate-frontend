import type { ManualReviewFlagKey } from "./lib/flag-catalog";

export type ManualReviewSummaryFlag = {
  flagKey: ManualReviewFlagKey;
  group: string;
  title: string;
  description: string;
  activeCount: number;
  dismissedCount: number;
};

export type ManualReviewSummaryResponse = {
  localEnv: "stage" | "prod";
  generatedAt: string;
  flags: ManualReviewSummaryFlag[];
};

export type ManualReviewCompanyHit = {
  companyId: string;
  name: string;
  wikidataId: string | null;
  lei: string | null;
  tags: string[];
  evidenceFingerprint: string;
  evidenceSummary: string;
  dismissalId: string | null;
  dismissedAt: string | null;
  dismissalNote: string | null;
  dismissedByUserId: string | null;
  dismissedByName: string | null;
};

export type ManualReviewIssuesResponse = {
  flagKey: ManualReviewFlagKey;
  title: string;
  description: string;
  totalMatching: number;
  activeCount: number;
  dismissedCount: number;
  offset: number;
  limit: number;
  companies: ManualReviewCompanyHit[];
};

export type ManualReviewDismissal = {
  id: string;
  companyId: string;
  companyName: string;
  wikidataId: string | null;
  lei: string | null;
  flagKey: string;
  flagTitle: string;
  evidenceFingerprint: string;
  evidenceSummary: string | null;
  note: string | null;
  userId: string;
  userName: string;
  createdAt: string;
};

export type ManualReviewDismissalsResponse = {
  total: number;
  offset: number;
  limit: number;
  dismissals: ManualReviewDismissal[];
};
