# Codebase Reorganization Plan

This document outlines a file structure that separates **shared** code (used by 2+ features) from **tab-specific** code, and provides step-by-step migration so nothing gets lost.

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

## 2. Proposed folder structure (detailed)

```
src/
├── components/
│   ├── job-details/
│   │   ├── SchemaSection.tsx
│   │   ├── JobStatusSection.tsx
│   │   ├── ErrorSection.tsx
│   │   ├── ReturnValueSection.tsx
│   │   ├── TechnicalDataSection.tsx
│   │   ├── JobRelationshipsSection.tsx
│   │   ├── JobMetadataSection.tsx
│   │   ├── JobDialogHeader.tsx
│   │   ├── JobDialogFooter.tsx
│   │   └── DialogTabs.tsx
│   ├── job-details-dialog.tsx
│   ├── job-specific-data-view.tsx
│   ├── scope/
│   │   ├── Scope3Section.tsx
│   │   ├── Scope12Section.tsx
│   │   ├── EconomySection.tsx
│   │   └── CopyJsonButton.tsx
│   ├── scope-emissions-display.tsx
│   ├── stat-cards.tsx
│   ├── wikidata-approval-display.tsx
│   ├── screenshot-slideshow.tsx
│   ├── ProtectedRoute.tsx
│   ├── LoginModal.tsx
│   └── GlobalLoginModal.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useCompanies.ts
│   ├── useQueues.ts
│   ├── useQueueStats.ts
│   ├── useQueueJobs.ts
│   └── useGroupedCompanies.ts
│
├── lib/
│   ├── api.ts
│   ├── api-helpers.ts
│   ├── auth-api.ts
│   ├── auth-types.ts
│   ├── constants.ts
│   ├── job-rerun-utils.ts
│   ├── queue-store.ts
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
│   │   ├── lib/
│   │   │   └── utils.ts          # (current components/tabs/upload/utils.ts)
│   │   └── types.ts
│   │
│   ├── processing/
│   │   └── ProcessingTab.tsx     # wraps QueueStatus (move from ui/queue-status)
│   │
│   ├── jobbstatus/               # swimlane
│   │   ├── JobbstatusTab.tsx      # (current views/swimlane-queue-status.tsx)
│   │   ├── components/
│   │   │   ├── OverviewStats.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── CompanyCard.tsx
│   │   │   └── YearRow.tsx
│   │   └── lib/
│   │       ├── swimlane-transform.ts
│   │       ├── swimlane-filters.ts
│   │       └── calculation-utils.ts
│   │
│   ├── workflow/
│   │   ├── WorkflowTab.tsx       # thin wrapper or re-export
│   │   └── WorkflowDiagram.tsx   # (current components/ui/workflow-diagram.tsx)
│   │
│   ├── debug/
│   │   └── DebugTab.tsx          # (current views/debug-view.tsx)
│   │
│   ├── errors/                   # error-browser (rename for consistency with tab value)
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
│   │   ├── lib/                  # rename from utils
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
│   │   └── ResultsTab.tsx        # placeholder (inline content from App today)
│   │
│   └── crawler/
│       └── CrawlerTab.tsx       # (current views/CrawlerPage content)
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
- **lib:** Shared lib keeps `workflow-utils` and `workflow-config` because job-details and jobbstatus both use them. Tab-specific lib under `tabs/jobbstatus/lib` holds swimlane-only code (`swimlane-transform`, `swimlane-filters`, `calculation-utils`).
- **ui:** All current `components/ui/*` move to top-level `ui/` so shared primitives live in one place. `queue-status` and `workflow-diagram` move into their tabs (processing, workflow) since they’re single-use.
- **tabs/errors:** Same as current error-browser; folder is named `errors` to match the tab value in App. Internal name can stay “error-browser” in component names.

---

## 3. File mapping (current → new)

Use this to verify every file is accounted for.

| Current path | New path |
|--------------|----------|
| **Shared – no move** | |
| `hooks/*.ts` | `hooks/*.ts` (unchanged) |
| `contexts/AuthContext.tsx` | `contexts/AuthContext.tsx` |
| `pages/AuthCallback.tsx` | `pages/AuthCallback.tsx` |
| **lib (shared – remove tab-only)** | |
| `lib/api.ts` | `lib/api.ts` |
| `lib/api-helpers.ts` | `lib/api-helpers.ts` |
| `lib/auth-api.ts` | `lib/auth-api.ts` |
| `lib/auth-types.ts` | `lib/auth-types.ts` |
| `lib/constants.ts` | `lib/constants.ts` |
| `lib/job-rerun-utils.ts` | `lib/job-rerun-utils.ts` |
| `lib/queue-store.ts` | `lib/queue-store.ts` |
| `lib/operators.ts` | `lib/operators.ts` |
| `lib/rx-api.ts` | `lib/rx-api.ts` |
| `lib/status-config.tsx` | `lib/status-config.tsx` |
| `lib/theme-colors.ts` | `lib/theme-colors.ts` |
| `lib/types.ts` | `lib/types.ts` |
| `lib/utils.ts` | `lib/utils.ts` |
| `lib/workflow-config.ts` | `lib/workflow-config.ts` |
| `lib/workflow-utils.ts` | `lib/workflow-utils.ts` |
| `lib/swimlane-transform.ts` | `tabs/jobbstatus/lib/swimlane-transform.ts` |
| `lib/swimlane-filters.ts` | `tabs/jobbstatus/lib/swimlane-filters.ts` |
| `lib/calculation-utils.ts` | `tabs/jobbstatus/lib/calculation-utils.ts` |
| **components → components (shared)** | |
| `components/job-details/*.tsx` | `components/job-details/*.tsx` |
| `components/job-details-dialog.tsx` | `components/job-details-dialog.tsx` |
| `components/job-specific-data-view.tsx` | `components/job-specific-data-view.tsx` |
| `components/scope/*.tsx` | `components/scope/*.tsx` |
| `components/scope-emissions-display.tsx` | `components/scope-emissions-display.tsx` |
| `components/stat-cards.tsx` | `components/stat-cards.tsx` |
| `components/wikidata-approval-display.tsx` | `components/wikidata-approval-display.tsx` |
| `components/screenshot-slideshow.tsx` | `components/screenshot-slideshow.tsx` |
| `components/ProtectedRoute.tsx` | `components/ProtectedRoute.tsx` |
| `components/LoginModal.tsx` | `components/LoginModal.tsx` |
| `components/GlobalLoginModal.tsx` | `components/GlobalLoginModal.tsx` |
| **components/ui → ui** | |
| `components/ui/button.tsx` | `ui/button.tsx` |
| `components/ui/dialog.tsx` | `ui/dialog.tsx` |
| `components/ui/tabs.tsx` | `ui/tabs.tsx` |
| `components/ui/loading-spinner.tsx` | `ui/loading-spinner.tsx` |
| `components/ui/sonner.tsx` | `ui/sonner.tsx` |
| `components/ui/view-toggle.tsx` | `ui/view-toggle.tsx` |
| `components/ui/markdown-display.tsx` | `ui/markdown-display.tsx` |
| `components/ui/collapsible-section.tsx` | `ui/collapsible-section.tsx` |
| `components/ui/metadata-display.tsx` | `ui/metadata-display.tsx` |
| `components/ui/value-renderer.tsx` | `ui/value-renderer.tsx` |
| `components/ui/json-viewer.tsx` | `ui/json-viewer.tsx` |
| `components/ui/fiscal-year-display.tsx` | `ui/fiscal-year-display.tsx` |
| `components/ui/multi-progress-bar.tsx` | `ui/multi-progress-bar.tsx` |
| `components/ui/wikidata-preview.tsx` | `ui/wikidata-preview.tsx` |
| `components/ui/slideshow-image.tsx` | `ui/slideshow-image.tsx` |
| `components/ui/slideshow-controls.tsx` | `ui/slideshow-controls.tsx` |
| `components/ui/header.tsx` | `ui/header.tsx` |
| **components/ui → tabs (single-use)** | |
| `components/ui/queue-status.tsx` | `tabs/processing/ProcessingTab.tsx` (inlined or moved) |
| `components/ui/workflow-diagram.tsx` | `tabs/workflow/WorkflowDiagram.tsx` |
| **views → tabs or pages** | |
| `views/swimlane-queue-status.tsx` | `tabs/jobbstatus/JobbstatusTab.tsx` |
| `views/debug-view.tsx` | `tabs/debug/DebugTab.tsx` |
| `views/CrawlerPage.tsx` | `tabs/crawler/CrawlerTab.tsx` |
| `views/SlideshowPage.tsx` | `pages/SlideshowPage.tsx` |
| **tabs/upload (rehome under src/tabs)** | |
| `components/tabs/upload/UploadTab.tsx` | `tabs/upload/UploadTab.tsx` |
| `components/tabs/upload/FileUploadZone.tsx` | `tabs/upload/components/FileUploadZone.tsx` |
| `components/tabs/upload/UrlUploadForm.tsx` | `tabs/upload/components/UrlUploadForm.tsx` |
| `components/tabs/upload/UploadList.tsx` | `tabs/upload/components/UploadList.tsx` |
| `components/tabs/upload/UploadListItem.tsx` | `tabs/upload/components/UploadListItem.tsx` |
| `components/tabs/upload/utils.ts` | `tabs/upload/lib/utils.ts` |
| `components/tabs/upload/types.ts` | `tabs/upload/types.ts` |
| **tabs/error-browser → tabs/errors** | |
| `components/tabs/error-browser/*` | `tabs/errors/*` (same internal structure; `utils/` → `lib/`) |

All other `src` files (`App.tsx`, `main.tsx`, `index.css`, `vite-env.d.ts`) stay where they are.

---

## 4. Import path changes

The alias `@/*` → `src/*` is unchanged. After moves, update imports as follows:

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
- In jobbstatus, use `@/tabs/jobbstatus/lib/...` and `@/tabs/jobbstatus/components/...` (or relative `../lib/`, `./components/`).  
- In errors, change `../utils` to `../lib` and keep `@/lib/utils`, `@/ui/...` for shared code.

---

## 5. Step-by-step migration (safe order)

Do this in order to avoid broken imports mid-move.

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

## 6. Nothing-lost checklist

Before considering the reorg done, confirm:

- [ ] Every file in the “File mapping” table has been moved (or intentionally left in place).
- [ ] No file under `src` was deleted except after its content was moved.
- [ ] All `@/components/ui/*` imports have been changed to `@/ui/*`.
- [ ] All `@/views/*` imports have been replaced by `@/tabs/*` or `@/pages/*`.
- [ ] All `@/lib/swimlane-*` and `@/lib/calculation-utils` imports point to `@/tabs/jobbstatus/lib/*`.
- [ ] All `@/components/tabs/upload/*` imports point to `@/tabs/upload/*`.
- [ ] All `@/components/tabs/error-browser/*` imports point to `@/tabs/errors/*`.
- [ ] `App.tsx` renders each tab from `@/tabs/<name>/...`.
- [ ] `npm run build` succeeds.
- [ ] Lint passes; no unused files or dead imports in moved code.

---

## 7. Optional: keep “error-browser” name under `tabs/errors`

If you prefer the folder to be `tabs/error-browser` instead of `tabs/errors`, use the same layout but name the folder `error-browser` and update imports to `@/tabs/error-browser/*`. The tab value in `App` can stay `"errors"` regardless.

---

## 8. Summary

- **Shared:** `components/`, `hooks/`, `lib/`, `ui/` at `src/` for anything used in 2+ places.
- **Tab-specific:** `tabs/<tab-name>/` with optional `components/`, `hooks/`, `lib/` (and `overview/`, `config/` where needed).
- **Migration:** Create folders first, move shared UI to `ui/`, then tab-only lib, then views and tab components, then upload and error-browser, then cleanup and verify with build + checklist.

Following this plan keeps the codebase consistent and makes it easy to find reusable vs tab-specific code while ensuring nothing is lost in the shuffle.

---

## 9. Post-reorg cleanup (manual)

After implementing the migration, you can remove obsolete paths so nothing is left behind:

- **`src/components/ui/`** – If the folder is empty (all primitives moved to `src/ui/`), remove the directory.
- **`src/components/tabs/upload/`** – Remove; upload tab now lives under `src/tabs/upload/`.
- **`src/components/tabs/error-browser/`** – Remove; error browser now lives under `src/tabs/errors/`.
- **`src/views/`** – Remove if empty (views moved to `tabs/` or `pages/`).
- **`src/components/swimlane/`** – Remove if empty (swimlane moved to `tabs/jobbstatus/components/`).

Example (from repo root):

```bash
rm -rf src/components/tabs/upload src/components/tabs/error-browser
rmdir src/views src/components/swimlane src/components/ui 2>/dev/null || true
```

Re-run `npm run build` after cleanup to confirm everything still works.
