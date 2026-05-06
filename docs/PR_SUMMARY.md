# PR summary

## Editor — single company list

- **Footer count:** “Showing X of Y companies” uses higher-contrast text so it’s easier to read.
- **Stats & sort:** Bar above the table shows company counts plus how many reporting periods in the filtered set have **verified emissions**; the filter card includes a short line with the same period verification summary. **Sort** dropdown: name A–Z / Z–A, Wikidata ID A–Z / Z–A.
- **Exclude tags:** New multi-select **Exclude tags** (real tags only). Companies matching the include-tag rules are removed if they have **any** selected excluded tag (e.g. include A/B/C, exclude D → `[A,B,D]` out, `[A,E,F]` in). Helper: `companyPassesExcludeTagFilter` in `editor-tag-and-payload-utils.ts`.

## Crawler

- **Run & Save Now** next to **Save & Run Later** opens the same pipeline run flow as Registry (batch, tags, workers, `createJobsFromUrls`).
- Crawler action buttons use compact labels and smaller type.

## Shared: run reports UI & pipeline

- **`RunReportsModal`** (`src/components/RunReportsModal.tsx`) — shared dialog; list rows typed as `RunReportListItem` (`src/lib/run-reports-types.ts`).
- **`useRunReportsPipeline`** (`src/hooks/useRunReportsPipeline.ts`) — shared state + validation + `createJobsFromUrls` + toasts; **`runForUrls(urls, { onSuccess })`** for tab-specific close/selection.
- **Registry** and **Crawler** use the hook + modal; removed `tabs/registry/components/RegistryRunReportsModal.tsx`.
- **`docs/FILE_STRUCTURE_REORG.md`** — documents new shared files.

## i18n

- New strings for editor stats/sort/exclude tags (EN + SV).
- Crawler: **Save & Run Later** / **Run & Save Now** (EN + SV equivalents).

---

*Use this section as the PR description body; trim bullets if this PR only includes a subset of the above.*
