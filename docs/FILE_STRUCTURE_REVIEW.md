# File Structure Review

Review date: against the rules in `FILE_STRUCTURE_REORG.md`.

**Rules:**
- **components / hooks / lib / ui** = used by at least 2 different tabs or app shell.
- **tabs/<name>/** = everything that exists only for that tab.

**Implementation status:** Recommendations 1–3 implemented. Recommendation 4 (queue hooks): removed the four legacy hooks and `lib/queue-store.ts` to keep the repo clean; can be re-added later if a queue-based processing tab is needed.

---

## What’s already correct

- **ui/** – Primitives (button, dialog, tabs, header, etc.) are used across tabs and app shell. ✓
- **hooks/useAuth.ts**, **contexts/AuthContext**, **components/LoginModal.tsx**, **GlobalLoginModal.tsx**, **ProtectedRoute.tsx** – App-wide auth. ✓
- **pages/** – AuthCallback, SlideshowPage. ✓
- **tabs/** – Each tab has its own folder; upload, errors, jobbstatus have components/lib (and hooks/overview/config where relevant). ✓
- **components/screenshot-slideshow** – Used by both job-specific-data-view (job details) and SlideshowPage. Correctly shared. ✓
- **lib/** – Core shared lib (api, types, workflow-utils, auth-*, etc.) is used by multiple tabs. ✓

---

## Recommendations (align with “shared = 2+ uses”)

### 1. Move job-details flow into jobbstatus tab (high impact)

**Current:** `components/job-details-dialog.tsx`, `components/job-details/`, `components/job-specific-data-view.tsx`, `components/scope-emissions-display.tsx`, `components/scope/`, `components/stat-cards.tsx`, `components/wikidata-approval-display.tsx` live in shared **components/**.

**Usage:** Only **CompanyCard** (in `tabs/jobbstatus/components/CompanyCard.tsx`) opens the job details dialog. The whole chain (dialog → job-specific-data-view → scope-emissions, scope sections, stat-cards, wikidata-approval) is only used from the jobbstatus tab.

**Recommendation:** Move this entire “job details” surface into the jobbstatus tab, e.g.:

- `tabs/jobbstatus/components/JobDetailsDialog.tsx` (and optionally a `job-details/` subfolder for the sections)
- `tabs/jobbstatus/components/JobSpecificDataView.tsx`
- `tabs/jobbstatus/components/ScopeEmissionsDisplay.tsx`
- `tabs/jobbstatus/components/scope/` (Scope3Section, Scope12Section, EconomySection, CopyJsonButton, YearBadge, DataCard, JsonRawDataBlock)
- `tabs/jobbstatus/components/StatCards.tsx`
- `tabs/jobbstatus/components/WikidataApprovalDisplay.tsx`

Then **CompanyCard** would import from `../JobDetailsDialog` (or similar) instead of `@/components/job-details-dialog`. This keeps “shared” strictly for things used by 2+ tabs or the app shell.

**Lib used only by scope sections:** `lib/company-reference-api.ts` is only used by Scope3Section, Scope12Section, EconomySection. You can either move it to `tabs/jobbstatus/lib/company-reference-api.ts` with the job-details move or leave it in **lib** if you prefer to keep “reference API” as a shared concept for future reuse.

---

### 2. Move crawler UI and API into crawler tab (medium impact)

**Current:** `components/crawler/ResultsList.tsx`, `components/crawler/ResultItem.tsx` and `lib/crawler-api.ts`, `lib/crawler-types.ts` are at the top level.

**Usage:** Only **CrawlerTab** uses them.

**Recommendation:**

- Move `components/crawler/` → `tabs/crawler/components/` (e.g. `ResultsList.tsx`, `ResultItem.tsx`).
- Move `lib/crawler-api.ts` and `lib/crawler-types.ts` → `tabs/crawler/lib/`.
- Update `CrawlerTab` to import from `./components/ResultsList` and `./lib/crawler-api` / `./lib/crawler-types`.

This keeps crawler-specific UI and data layer inside the crawler tab.

---

### 3. Hook only used by crawler (low impact)

**Current:** `hooks/useAllCompanyNames.ts` exists at the top level.

**Usage:** No current imports found; it may be dead code or leftover from an earlier crawler implementation.

**Recommendation:** Either wire it into the crawler (and move it to `tabs/crawler/hooks/useAllCompanyNames.ts`) or remove it. If you keep it for crawler, moving it under the tab keeps the “shared hooks = used in 2+ places” rule consistent.

---

### 4. Queue hooks: legacy from RxJS/queue-store refactor (investigation)

**Current:** `useQueues`, `useQueueStats`, `useQueueJobs`, `useGroupedCompanies` live in **hooks/** and are **not imported anywhere** in the current codebase.

**History (from git):**

- They were introduced as part of an **RxJS-based queue and state refactor** (see commits around “Implement reactive programming with RxJS”, “Implement fully reactive job grouping with RxJS FRP”, and “fixing merging errors across threads and updating to use pipeline api” — Oct 2025).
- **They used to be used:**
  - **App.tsx** called `useQueues()` and used `refresh()` when submitting uploads and when switching to the “processing” or “jobbstatus” tabs, so the queue data would update.
  - That behaviour was removed in a later refactor (e.g. “temp commit” 06f10b8, Oct 28 2025), which switched upload to a batch job-creation API and dropped the `refresh()` calls and tab-based refresh.
- The hooks depend on **`lib/queue-store.ts`** (RxJS `QueueStore`). Nothing uses the hooks now, so the store is only referenced by these four hooks — i.e. the whole “queue store + these hooks” path is currently unused.

**Recommendation:**

- **Keep** if you plan to bring back a **queue-centric processing tab** (e.g. a view that shows raw queue stats, per-queue job lists, or reactive updates from `queueStore`) and will wire it to these hooks.
- **Remove** if the app is fully committed to the **companies/swimlane** path (e.g. `useCompanies` + jobbstatus tab) and you don’t intend to add a queue-based UI. In that case you can delete the four hooks and consider removing or repurposing **`lib/queue-store.ts`** if nothing else uses it.

So: they are **legacy from an improved refactor** that was then superseded by the current flow; treat them as optional until you decide whether a queue-based feature is in scope.

---

## Summary table

| Area | Status | Notes |
|------|--------|--------|
| Job details flow | **Done** | Moved to `tabs/jobbstatus/components/` (JobDetailsDialog, JobSpecificDataView, ScopeEmissionsDisplay, scope/, StatCards, WikidataApprovalDisplay) and `tabs/jobbstatus/lib/company-reference-api.ts`. |
| Crawler UI + lib | **Done** | Moved to `tabs/crawler/components/` and `tabs/crawler/lib/`. |
| useAllCompanyNames | **Done** | Moved to `tabs/crawler/hooks/useAllCompanyNames.ts` (WIP feature). |
| useQueues / useQueueStats / useQueueJobs / useGroupedCompanies | **Removed** | Legacy hooks and `lib/queue-store.ts` deleted; can re-add if a queue-based processing tab is added later. |

---

## Optional: doc update

You can update **FILE_STRUCTURE_REORG.md** (e.g. “Proposed folder structure” and “File mapping”) so it matches the current layout after these moves.
