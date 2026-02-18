# File Structure (Current)

This document describes the **current** file structure after the reorg. Shared code (used by 2+ features) lives in **components**, **hooks**, **lib**, and **ui**. Tab-only code lives under **tabs/<name>/**.

---

## 1. Target structure (high level)

```
src/
├── components/     # Shared composite components (used by 2+ tabs/features)
├── hooks/         # Shared React hooks
├── lib/           # Shared utilities, types, API, config
├── ui/            # Shared UI primitives (button, dialog, tabs, etc.)
├── tabs/          # One folder per tab; each has its own components, hooks, lib
├── pages/         # Route-level pages (auth callback, slideshow)
├── contexts/     # App-wide context (Auth)
├── App.tsx
├── main.tsx
├── index.css
└── vite-env.d.ts
```

**Rules of thumb:**
- **components / hooks / lib / ui** = used by at least 2 different tabs or app shell (Header, auth, etc.).
- **tabs/<name>/** = everything that exists only for that tab; can mirror `components`, `hooks`, `lib`, `ui` inside the tab.

---

## 2. Current folder structure (detailed)

```
src/
├── components/
│   ├── screenshot-slideshow.tsx   # shared: job details + SlideshowPage
│   ├── ProtectedRoute.tsx
│   ├── LoginModal.tsx
│   └── GlobalLoginModal.tsx
│
├── hooks/
│   ├── useAuth.ts
│   └── useCompanies.ts
│
├── lib/
│   ├── api.ts
│   ├── api-helpers.ts
│   ├── auth-api.ts
│   ├── auth-types.ts
│   ├── constants.ts
│   ├── job-rerun-utils.ts
│   ├── operators.ts
│   ├── rx-api.ts
│   ├── status-config.tsx
│   ├── theme-colors.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── workflow-config.ts
│   └── workflow-utils.ts
│
├── ui/
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── tabs.tsx
│   ├── loading-spinner.tsx
│   ├── sonner.tsx
│   ├── view-toggle.tsx
│   ├── markdown-display.tsx
│   ├── collapsible-section.tsx
│   ├── metadata-display.tsx
│   ├── value-renderer.tsx
│   ├── json-viewer.tsx
│   ├── fiscal-year-display.tsx
│   ├── multi-progress-bar.tsx
│   ├── wikidata-preview.tsx
│   ├── slideshow-image.tsx
│   ├── slideshow-controls.tsx
│   └── header.tsx
│
├── tabs/
│   ├── upload/
│   │   ├── UploadTab.tsx
│   │   ├── components/
│   │   │   ├── FileUploadZone.tsx
│   │   │   ├── UrlUploadForm.tsx
│   │   │   ├── UploadList.tsx
│   │   │   └── UploadListItem.tsx
│   │   ├── lib/utils.ts
│   │   └── types.ts
│   │
│   ├── processing/
│   │   └── ProcessingTab.tsx
│   │
│   ├── jobbstatus/
│   │   ├── JobbstatusTab.tsx
│   │   ├── components/
│   │   │   ├── OverviewStats.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── CompanyCard.tsx
│   │   │   ├── YearRow.tsx
│   │   │   ├── JobDetailsDialog.tsx
│   │   │   ├── JobSpecificDataView.tsx
│   │   │   ├── ScopeEmissionsDisplay.tsx
│   │   │   ├── StatCards.tsx
│   │   │   ├── WikidataApprovalDisplay.tsx
│   │   │   ├── job-details/
│   │   │   │   ├── SchemaSection.tsx
│   │   │   │   ├── JobStatusSection.tsx
│   │   │   │   ├── ErrorSection.tsx
│   │   │   │   ├── ReturnValueSection.tsx
│   │   │   │   ├── TechnicalDataSection.tsx
│   │   │   │   ├── JobRelationshipsSection.tsx
│   │   │   │   ├── JobMetadataSection.tsx
│   │   │   │   ├── JobDialogHeader.tsx
│   │   │   │   ├── JobDialogFooter.tsx
│   │   │   │   └── DialogTabs.tsx
│   │   │   └── scope/
│   │   │       ├── Scope3Section.tsx
│   │   │       ├── Scope12Section.tsx
│   │   │       ├── EconomySection.tsx
│   │   │       ├── CopyJsonButton.tsx
│   │   │       ├── YearBadge.tsx
│   │   │       ├── DataCard.tsx
│   │   │       └── JsonRawDataBlock.tsx
│   │   └── lib/
│   │       ├── swimlane-transform.ts
│   │       ├── swimlane-filters.ts
│   │       ├── calculation-utils.ts
│   │       └── company-reference-api.ts
│   │
│   ├── workflow/
│   │   ├── WorkflowTab.tsx
│   │   └── WorkflowDiagram.tsx
│   │
│   ├── debug/
│   │   └── DebugTab.tsx
│   │
│   ├── errors/
│   │   ├── ErrorBrowserTab.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── AggregateMetrics.tsx
│   │   │   ├── BrowserView.tsx
│   │   │   ├── CompanyTableRow.tsx
│   │   │   ├── DiscrepancyBadge.tsx
│   │   │   ├── DiscrepancyFilterPills.tsx
│   │   │   ├── ErrorDistributionHistogram.tsx
│   │   │   ├── HardestReportsView.tsx
│   │   │   ├── OverviewView.tsx
│   │   │   └── PerformanceMetricsTable.tsx
│   │   ├── overview/
│   │   │   ├── index.ts
│   │   │   ├── DataPointBar.tsx
│   │   │   ├── OverviewSection.tsx
│   │   │   ├── ScopeSection.tsx
│   │   │   └── ScopeSummary.tsx
│   │   ├── hooks/
│   │   │   └── useErrorBrowserData.ts
│   │   ├── lib/
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── csv.ts
│   │   │   ├── discrepancy.ts
│   │   │   ├── emissions.ts
│   │   │   └── metrics.ts
│   │   └── config/
│   │       └── discrepancyConfig.tsx
│   │
│   ├── results/
│   │   └── ResultsTab.tsx
│   │
│   └── crawler/
│       ├── CrawlerTab.tsx
│       ├── components/
│       │   ├── ResultsList.tsx
│       │   └── ResultItem.tsx
│       ├── lib/
│       │   ├── crawler-api.ts
│       │   └── crawler-types.ts
│       └── hooks/
│           └── useAllCompanyNames.ts
│
├── pages/
│   ├── AuthCallback.tsx
│   └── SlideshowPage.tsx
│
├── contexts/
│   └── AuthContext.tsx
│
├── App.tsx
├── main.tsx
├── index.css
└── vite-env.d.ts
```

**Notes:**
- **Job-details flow** (dialog, sections, scope, stat-cards, wikidata-approval) lives under **tabs/jobbstatus** because only CompanyCard (jobbstatus) uses it.
- **Crawler** has its own **components**, **lib**, and **hooks** under **tabs/crawler**.
- **Shared lib** keeps `workflow-utils`, `workflow-config`, etc. **tabs/jobbstatus/lib** holds swimlane + company-reference only.
- **tabs/errors** uses `lib/` (not `utils/`). Folder name `errors` matches the tab value in App.

---

## 3. Current file locations (reference)

| Location | Contents |
|----------|----------|
| **components/** | `screenshot-slideshow.tsx`, `ProtectedRoute.tsx`, `LoginModal.tsx`, `GlobalLoginModal.tsx` only |
| **hooks/** | `useAuth`, `useCompanies` |
| **lib/** | Shared API, auth, workflow, queue-store, utils, types, etc. (no tab-only code) |
| **ui/** | All shared primitives: button, dialog, tabs, loading-spinner, collapsible-section, etc. |
| **tabs/jobbstatus/** | Tab + components (OverviewStats, FilterBar, CompanyCard, YearRow, JobDetailsDialog, job-details/*, scope/*, etc.) + lib (swimlane-*, calculation-utils, company-reference-api) |
| **tabs/crawler/** | CrawlerTab + components (ResultsList, ResultItem) + lib (crawler-api, crawler-types) + hooks (useAllCompanyNames) |
| **tabs/upload/** | UploadTab + components/ + lib/utils.ts + types.ts |
| **tabs/errors/** | ErrorBrowserTab + components/, overview/, hooks/, lib/, config/ |
| **tabs/processing/** | ProcessingTab.tsx |
| **tabs/workflow/** | WorkflowTab.tsx, WorkflowDiagram.tsx |
| **tabs/debug/** | DebugTab.tsx |
| **tabs/results/** | ResultsTab.tsx |
| **pages/** | AuthCallback.tsx, SlideshowPage.tsx |
| **contexts/** | AuthContext.tsx |

---

## 4. Import conventions

The alias `@/*` → `src/*` is unchanged. Imports in the codebase use:

| Old import | New import |
|------------|------------|
| `@/components/ui/button` | `@/ui/button` |
| `@/components/ui/dialog` | `@/ui/dialog` |
| … (all `components/ui/*`) | `@/ui/*` |
| `@/views/swimlane-queue-status` | `@/tabs/jobbstatus/JobbstatusTab` |
| `@/views/debug-view` | `@/tabs/debug/DebugTab` |
| `@/components/swimlane/*` | `@/tabs/jobbstatus/components/*` |
| `@/lib/swimlane-transform` | `@/tabs/jobbstatus/lib/swimlane-transform` |
| `@/lib/swimlane-filters` | `@/tabs/jobbstatus/lib/swimlane-filters` |
| `@/lib/calculation-utils` | `@/tabs/jobbstatus/lib/calculation-utils` |
| `@/components/tabs/upload/UploadTab` | `@/tabs/upload/UploadTab` |
| `@/components/tabs/upload/FileUploadZone` (relative in UploadTab) | `./components/FileUploadZone` etc. |
| `@/components/tabs/error-browser/*` | `@/tabs/errors/*` (and inside errors: `../utils` → `../lib`) |
| `@/components/ui/queue-status` | `@/tabs/processing/ProcessingTab` |
| `@/components/ui/workflow-diagram` | `@/tabs/workflow/WorkflowDiagram` |

**Tab-internal imports:**  
- Jobbstatus and crawler use relative paths (e.g. `./components/...`, `../lib/...`) or `@/tabs/<name>/...`.  
- Errors tab uses `../lib` (not `../utils`). Shared code stays `@/lib`, `@/ui`, `@/components/screenshot-slideshow`, etc.

---

## 5. Migration steps (completed)

The following steps were followed to perform the reorg. Kept for reference.

### Phase A: Create new folders (no moves yet)

1. Create `src/ui/`.
2. Create `src/tabs/upload/`, `tabs/upload/components/`, `tabs/upload/lib/`.
3. Create `src/tabs/processing/`, `tabs/workflow/`, `tabs/debug/`, `tabs/results/`, `tabs/crawler/`.
4. Create `src/tabs/jobbstatus/`, `tabs/jobbstatus/components/`, `tabs/jobbstatus/lib/`.
5. Create `src/tabs/errors/` and mirror error-browser layout: `components/`, `overview/`, `hooks/`, `lib/`, `config/`.

### Phase B: Move shared UI into `ui/`

6. Move every file from `src/components/ui/` into `src/ui/` **except** `queue-status.tsx` and `workflow-diagram.tsx`.
7. Update all imports from `@/components/ui/X` to `@/ui/X` across the codebase (grep for `@/components/ui/`).

### Phase C: Move tab-only lib (jobbstatus)

8. Move `lib/swimlane-transform.ts` → `tabs/jobbstatus/lib/swimlane-transform.ts`.
9. Move `lib/swimlane-filters.ts` → `tabs/jobbstatus/lib/swimlane-filters.ts`.
10. Move `lib/calculation-utils.ts` → `tabs/jobbstatus/lib/calculation-utils.ts`.
11. Update imports in those three files (e.g. `./types` → `@/lib/types`, `./workflow-utils` → `@/lib/workflow-utils`).
12. Update every file that imported them: point to `@/tabs/jobbstatus/lib/swimlane-transform`, etc.

### Phase D: Move swimlane view and components to jobbstatus tab

13. Move `views/swimlane-queue-status.tsx` → `tabs/jobbstatus/JobbstatusTab.tsx`. Update its imports to use `@/tabs/jobbstatus/components/*`, `@/tabs/jobbstatus/lib/*`, and shared `@/lib`, `@/ui`, `@/hooks`.
14. Move `components/swimlane/OverviewStats.tsx` → `tabs/jobbstatus/components/OverviewStats.tsx`.
15. Move `components/swimlane/FilterBar.tsx` → `tabs/jobbstatus/components/FilterBar.tsx`.
16. Move `components/swimlane/CompanyCard.tsx` → `tabs/jobbstatus/components/CompanyCard.tsx`.
17. Move `components/swimlane/YearRow.tsx` → `tabs/jobbstatus/components/YearRow.tsx`.
18. Update all imports in jobbstatus (internal relative paths and shared `@/lib`, `@/ui`, `@/components/job-details-dialog`, etc.).
19. In `App.tsx`, replace `SwimlaneQueueStatus` from `@/views/swimlane-queue-status` with `JobbstatusTab` from `@/tabs/jobbstatus/JobbstatusTab`.

### Phase E: Processing and workflow tabs

20. Create `tabs/processing/ProcessingTab.tsx` that renders the current `QueueStatus` content (move/copy from `components/ui/queue-status.tsx`), then delete the old file. Update `App.tsx` to use `@/tabs/processing/ProcessingTab`.
21. Move `components/ui/workflow-diagram.tsx` → `tabs/workflow/WorkflowDiagram.tsx`. Create `tabs/workflow/WorkflowTab.tsx` that re-exports or renders it. Update `App.tsx` to use `@/tabs/workflow/WorkflowTab` or `@/tabs/workflow/WorkflowDiagram`.

### Phase F: Debug and crawler tabs

22. Move `views/debug-view.tsx` → `tabs/debug/DebugTab.tsx`. Update imports; update `App.tsx` to use `@/tabs/debug/DebugTab`.
23. Move `views/CrawlerPage.tsx` → `tabs/crawler/CrawlerTab.tsx`. Update `App.tsx` to use `@/tabs/crawler/CrawlerTab`.
24. Move `views/SlideshowPage.tsx` → `pages/SlideshowPage.tsx` (if not already under pages). Update any imports; `ScreenshotSlideshow` stays in `components/` and is imported from `@/components/screenshot-slideshow`.

### Phase G: Upload tab rehome

25. Move `components/tabs/upload/UploadTab.tsx` → `tabs/upload/UploadTab.tsx`.
26. Move `components/tabs/upload/FileUploadZone.tsx` → `tabs/upload/components/FileUploadZone.tsx`, and same for `UrlUploadForm`, `UploadList`, `UploadListItem`.
27. Move `components/tabs/upload/utils.ts` → `tabs/upload/lib/utils.ts`.
28. Move `components/tabs/upload/types.ts` → `tabs/upload/types.ts`.
29. Update all imports inside the upload tab (relative `./components/`, `./lib/utils`, `./types`) and in `App.tsx` (`@/tabs/upload/UploadTab`).

### Phase H: Error-browser → errors tab

30. Move entire `components/tabs/error-browser/` tree into `tabs/errors/` (keep structure; rename `utils/` → `lib/`).
31. Update all imports from `@/components/tabs/error-browser/*` to `@/tabs/errors/*`.
32. Inside `tabs/errors`, update imports that referenced `../utils` to `../lib`.

### Phase I: Results placeholder

33. Create `tabs/results/ResultsTab.tsx` with the current placeholder content from `App.tsx` (title + short text). Update `App.tsx` to use `@/tabs/results/ResultsTab`.

### Phase J: Cleanup and verification

34. Delete empty directories: `components/ui/`, `components/swimlane/`, `components/tabs/`, `views/`.
35. Run `npm run build` and fix any remaining import or path errors.
36. Run tests if present; fix any snapshot or path references.
37. Grep for `views/`, `components/ui/`, `components/swimlane/`, `components/tabs/` to ensure no stale references.

---

## 6. Nothing-lost checklist (completed)

Used to verify the reorg; all items were confirmed:

- [x] Every file accounted for; job-details/scope moved to jobbstatus; crawler to tabs/crawler.
- [x] No file deleted except after move; empty `components/tabs/`, `views/` removed.
- [x] All `@/components/ui/*` → `@/ui/*`.
- [x] All `@/views/*` → `@/tabs/*` or `@/pages/*`.
- [x] Jobbstatus and crawler use `@/tabs/.../lib/*` and relative paths.
- [x] `App.tsx` renders each tab from `@/tabs/<name>/...`.
- [x] Build and lint pass.

---

## 7. Summary

- **Shared:** `components/`, `hooks/`, `lib/`, `ui/` at `src/` for anything used in 2+ places.
- **Tab-specific:** `tabs/<tab-name>/` with optional `components/`, `hooks/`, `lib/` (and `overview/`, `config/` where needed).
- **Job-details and scope** live under `tabs/jobbstatus` (used only by CompanyCard). **Crawler** has its own components, lib, and hooks under `tabs/crawler`.

---

## 8. Historical: post-reorg cleanup (done)

Obsolete paths were removed:

- **`src/components/ui/`** – Removed; primitives moved to `src/ui/`.
- **`src/components/tabs/`** – Removed; upload and error-browser moved to `src/tabs/`.
- **`src/views/`** – Removed; views moved to `tabs/` or `pages/`.
- **`src/components/swimlane/`** – Removed; moved to `tabs/jobbstatus/components/`.
- **`src/components/job-details/`**, **scope/**, etc. – Removed; moved to `tabs/jobbstatus/components/`.
- **`src/components/crawler/`**, **`src/lib/crawler-*`** – Removed; moved to `tabs/crawler/`.

Example (from repo root):

```bash
rm -rf src/components/tabs/upload src/components/tabs/error-browser
rmdir src/views src/components/swimlane src/components/ui 2>/dev/null || true
```

Re-run `npm run build` after cleanup to confirm everything still works.
