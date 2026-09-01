const QA_REVIEWER_STORAGE_KEY = "climatePlansQa.reviewedBy";

/** Prefer signed-in Validate user; otherwise a locally remembered QA display name. */
export function getQaReviewerIdentity(
  authUser: {
    name?: string | null;
    email?: string | null;
  } | null,
): string | null {
  const fromAuth = authUser?.name?.trim() || authUser?.email?.trim();
  if (fromAuth) return fromAuth;
  const stored = localStorage.getItem(QA_REVIEWER_STORAGE_KEY)?.trim();
  return stored || null;
}

export function setQaReviewerIdentity(name: string): void {
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(QA_REVIEWER_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(QA_REVIEWER_STORAGE_KEY);
  }
}

/** Resolve reviewer for a save; prompts once if neither auth nor storage has a name. */
export function resolveQaReviewerForSave(
  authUser: {
    name?: string | null;
    email?: string | null;
  } | null,
): string | null {
  const existing = getQaReviewerIdentity(authUser);
  if (existing) return existing;

  const entered = window.prompt(
    "Enter your name for QA reviews (saved in this browser):",
  );
  if (!entered?.trim()) return null;
  setQaReviewerIdentity(entered);
  return entered.trim();
}
