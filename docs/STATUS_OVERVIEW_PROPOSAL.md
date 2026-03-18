# Status Overview — Solution Proposal

**Goal:** Replace Excel-based tracking with a single **Status Overview** tab in Validate that gives a high-level view of report status across companies and report years, with clear icons and multi-select filtering.

---

## 1. Scope and Row Model

- **One row per (company, report year).**
- Rows are grouped by company (optional) or shown as a flat list; each row represents one “report slot” (e.g. Company A – 2023, Company A – 2024, Company B – 2023).
- **Columns** answer the questions below; each cell uses a small set of **status icons** for quick scanning.

### Status icon semantics (proposed)

| Icon | Meaning | Use when |
|------|--------|----------|
| ✓ (check) | Done / OK | Step completed successfully |
| ! (warning) | Issue / needs attention | Errors, missing data, or unverified where verification is expected |
| ⏱ (clock) | Pending / in progress | Pipeline running, data not yet in target env |
| – (dash) | Not applicable / unknown | No data, no run, or N/A for this step |

Optional: color (e.g. green / amber / gray) to reinforce the icon.

---

## 2. Columns (Data Questions)

| # | Column | Question | Data source | Icon logic (draft) |
|---|--------|----------|-------------|--------------------|
| 1 | **Report** | Do we have a report? Link or file? For which year? | **New:** Garbo “report” table + endpoint (see below) | ✓ = report record with link/file, – = no record |
| 2 | **Pipeline run** | Has the report run through the pipeline? | Pipeline-api: process list (by company + year) | ✓ = process completed, ⏱ = process running/pending, – = no process |
| 3 | **Pipeline errors** | Were there errors during the pipeline? | Pipeline-api: process/job status (failed jobs) | ✓ = no errors, ! = any failed job, – = no run |
| 4 | **Data in prod** | Is all data in prod (Garbo)? | Garbo prod: company + reporting period + emissions/data presence | ✓ = data present, ! = partial/missing, – = not in prod |
| 5 | **Emissions verified (prod)** | Is the emissions data verified in prod? | Garbo prod: company `hasUnverifiedEmissions` (or per–reporting-period metadata) | ✓ = verified, ! = unverified, – = no prod data |
| 6 | **Data in stage** | Is the data in stage (Garbo)? | Garbo stage: company + reporting period + data presence | ✓ = present, ! = partial, – = not in stage |

**Report (column 1)** is today only partly represented: Garbo has `ReportingPeriod` with `reportURL` per (company, year), but there is no dedicated “report registry” that tracks “we have a PDF/file for this company–year” independent of the pipeline. The proposal is to add a small **report registry** in Garbo (new table + endpoint) so “Do we have a report?” is explicit and can show a link; see Section 4.

---

## 2b. Data Flow Gap and Report Registry as Master List

**Current gap:** There is no single place that tracks "we have a report" from discovery through to pipeline and Garbo.

- **Crawler:** Validate calls Garbo `POST /reports`, which runs Firecrawl and returns URLs only — **nothing is persisted**. Users can export to CSV, but there is no "waiting room" in the DB.
- **Link upload:** Validate sends URLs to pipeline-api `POST /queues/parsePdf`; pipeline runs and only writes to Garbo when `saveToAPI` runs (after we have a `wikidataId`). No Garbo record exists for the report until that point.
- **File upload:** Same: pipeline-api uploads to S3 and enqueues a job; Garbo only sees the report when the pipeline creates/updates company + reporting period via `saveToAPI`.
- **Garbo today:** `ReportingPeriod` belongs to `Company` (keyed by `wikidataId`). So we can only store a report URL in Garbo once we have a company in the DB — there is no row for "report we know about but not yet linked to a company."

**Idea (report registry as master list):** Use one table as the single list of "reports we know about," regardless of source and before we have a company link:

- Whenever the **crawler** saves a report, or a report is added via **link** or **file** upload, insert a row: **report year**, **company name** (or "unknown" for file upload until parsed), **report URL** (external link or S3 URL), **source** (crawler | link_upload | file_upload), and a **unique report id**.
- Long-term: use that **report id** on the company report period table (e.g. `ReportingPeriod.reportId` optional FK) so we always have the connection; or at least use the registry to **populate / match** `wikidataId` and reporting period once we have them.
- The **Status Overview** is then based on this master list: one row per report registry entry, with columns showing pipeline run, errors, data in prod/stage, verification. Optional **comments** field on the registry for manual review notes (e.g. "Wrong PDF", "Needs re-parse") that can be cleared when resolved.

This gives a single flow: report discovered/uploaded → registry row → (optional) pipeline run → link to company/reporting period when wikidataId is known → overview shows full journey.

---

## 2c. Alternative Approaches (Brainstorm)

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **A. Report registry in Garbo (master list)** | New table in Garbo: report id, companyName, reportYear, reportURL, source, optional companyId/reportingPeriodId, comments. Crawler, link upload, and file upload all create/update rows; pipeline or a sync step links to Company/ReportingPeriod when wikidataId exists. | Single source of truth; works before company exists; Status Overview rows from this list; Garbo already owns companies/reporting periods. | New table + endpoints; crawler and pipeline need to call Garbo to register. |
| **B. Pipeline-api as source of "report exists"** | No new Garbo table. "Report" = pipeline process exists for (companyName, year) OR Garbo ReportingPeriod has reportURL. | No schema change in Garbo. | Crawler-found reports still not persisted; no waiting room; joining by name+year only. |
| **C. Report registry in pipeline-api** | New table in pipeline-api; crawler and uploads create rows there; job data carries reportId. | Pipeline naturally has process + report. | Pipeline would need Garbo data for prod/stage/verification columns; "report" split across two systems. |
| **D. Minimal "pending report" in Garbo** | Single table for unlinked reports only (companyName, year, reportURL, source). When ReportingPeriod is created, match and mark resolved (or delete). Master list = pending + ReportingPeriods. | Simpler than full registry. | Same report can appear in two places (pending vs period); matching logic (name+year+URL) can be fuzzy. |
| **E. Extend ReportingPeriod only** | Allow ReportingPeriod without Company (e.g. nullable companyId) or a "staging" company. | Reuses existing model. | ReportingPeriod is tied to company in current schema; would require nullable FK and more branching in Garbo. |

**Recommendation:** **A — Report registry in Garbo as master list.** It fixes the connector gap (crawler → DB, upload → DB before pipeline links to company), gives one place to track from discovery to done, and supports comments and overview rows without overloading pipeline-api. Optional FK from `ReportingPeriod` to the report registry row keeps the connection explicit once linked.

---

## 3. Where to Aggregate: Options

Status data currently lives in three places:

- **Pipeline-api:** process list (`/processes`, `/processes/companies`), job status (failed/completed). Key: `threadId` or `unknown-${companyName}`; fields: `companyName`, `reportYear` (no `wikidataId` in API today).
- **Garbo prod:** companies, reporting periods (companyId + year), emissions, verification (`hasUnverifiedEmissions` etc.). Key: `wikidataId` + `ReportingPeriod.year`.
- **Garbo stage:** same schema, separate deployment/DB.

**Option A — Aggregate in Validate (frontend)**  
- Validate calls pipeline-api (processes) and Garbo prod + Garbo stage (companies with reporting periods) in parallel.
- Builds rows by: (1) taking a “master list” of (company, year) from one source (e.g. Garbo prod companies + their reporting periods), (2) enriching with pipeline process status and stage data.
- **Pros:** No new backend; reuses existing APIs.  
- **Cons:** Multiple round-trips; joining by company name + year (fuzzy); no single filter API (filtering by tag/year/company in UI only).

**Option B — New “status overview” API in Garbo**  
- Garbo gets a new endpoint, e.g. `GET /api/status-overview` (or `/api/reports/status`), that returns rows per (company, report year) with all six dimensions.
- Garbo would need to call pipeline-api (or ingest pipeline status periodically) and optionally stage Garbo; or pipeline status is fetched by Validate and merged with Garbo response.
- **Pros:** Single source of truth for “report registry” and Garbo-side status; can support server-side filter by tag, company, year.  
- **Cons:** Garbo must depend on pipeline-api or a sync job; more backend work.

**Option C — New “status overview” API in pipeline-api**  
- Pipeline-api exposes something like `GET /api/processes/status-overview` that returns (company, year) rows with pipeline status and, if needed, caches or calls Garbo for prod/stage/verification.
- **Pros:** Pipeline is the natural place for “did it run / any errors?”  
- **Cons:** Pipeline would need to call Garbo (prod + stage) and possibly hold report registry; cross-service dependency.

**Recommendation**  
- **Short term:** **Option A** — implement the Status Overview tab in Validate, aggregating in the frontend. Master list: Garbo prod companies + reporting periods (covers “we have a company and a year”); enrich with pipeline `/processes/companies` (and process detail for errors) and Garbo stage companies. Join by company name + year (and optionally store `wikidataId` in pipeline job data later for a more reliable join).
- **Medium term:** Introduce the **report registry** in Garbo as the **master list** (see 2b, 4): new table + `GET/POST/PATCH /api/reports/registry` so “Do we have a report?” is first-class and crawler/upload flows persist reports before company link. Status Overview can then use the registry as the row source. Add an optional **Garbo status-overview endpoint** (Option B) that returns rows with all columns, including pipeline status if pipeline-api is called from Garbo or if Validate still merges pipeline data client-side. This keeps Garbo as the place for “report + prod/stage/verification” and avoids pushing Garbo data into pipeline-api.

---

## 4. Report Registry (Garbo) — Master List Table and Endpoint

To support column 1 and the full flow from discovery to pipeline to prod (see 2b), add a **report registry** in Garbo that can hold reports **before** they are linked to a company.

### 4.1 Schema (recommended)

- **New table `Report` (or `ReportRegistry`):**
  - `id` (cuid, PK)
  - `companyName` (string) — may be "unknown" for file upload until parsed
  - `reportYear` (string)
  - `reportURL` (string) — external link or S3 URL
  - `source` (enum: `crawler` | `link_upload` | `file_upload`)
  - `fileStorageKey` (string, optional) — S3 key if stored in our bucket
  - `companyId` (string, optional, FK → Company.wikidataId) — set when we know the company
  - `reportingPeriodId` (string, optional, FK → ReportingPeriod.id) — set when pipeline creates/updates the period
  - `comments` (text, optional) — manual review notes, errors, or follow-ups; clear when resolved
  - `createdAt`, `updatedAt`
- **Optional on `ReportingPeriod`:** `reportId` (optional FK → Report.id) so each period can point back to the registry row that originated it.
- No unique on `(companyId, year)` while `companyId` is null; optional unique on `(reportURL)` to reduce duplicates, or allow duplicates and dedupe in UI.

### 4.2 When to create registry rows

- **Crawler:** New action "Save to list" in Validate → `POST /api/reports/registry` (or `POST /api/reports` with persist flag) with body `[{ companyName, reportYear, reportURL }]`; Garbo creates one row per item with `source = crawler`.
- **Link upload:** Before or when Validate (or pipeline-api) queues the URL, call Garbo `POST /api/reports/registry` with company name (if user provided), year, URL, `source = link_upload`. Optionally pass `reportId` in pipeline job data so we can link later.
- **File upload:** After S3 upload, pipeline-api (or Validate) calls Garbo `POST /api/reports/registry` with `reportURL = S3 URL`, `companyName`/`reportYear` unknown or from form, `source = file_upload`. When parsePdf extracts company/year, Garbo can PATCH the row (e.g. by reportId if passed in job, or by matching S3 URL).

### 4.3 When to link to Company / ReportingPeriod

- **Option 1 (simplest first):** When pipeline `saveToAPI` runs, it already has `wikidataId` and creates/updates reporting periods. Garbo can run a **match step** (periodic or on-demand): find `Report` rows with matching `companyName` + `reportYear` (or `reportURL` in the created ReportingPeriod), set `companyId` and `reportingPeriodId` (and optionally set `ReportingPeriod.reportId` if we add that FK).
- **Option 2:** Pipeline job data includes `reportId` when the job was created with one; when saveToAPI (or a Garbo webhook) receives the created reporting period, it updates the Report row and sets `ReportingPeriod.reportId` in the same request. Requires pipeline and Garbo to accept reportId.

### 4.4 Endpoints

- **List (for Status Overview):** `GET /api/reports/registry` (or `GET /api/reports/status`) — returns report registry rows with optional `companyId`/`reportingPeriodId` and comments. Query params: `tags[]` (filter by company tags once linked), `year`, `companyName`, `source`.
- **Create:** `POST /api/reports/registry` — body `{ companyName, reportYear, reportURL, source?, fileStorageKey? }` or array of same.
- **Update (link + comments):** `PATCH /api/reports/registry/:id` — set `companyId`, `reportingPeriodId`, and/or `comments`.

This gives a single place to answer "do we have a report for this company–year?" and to show the full journey; the Status Overview tab uses this as the **master list** for rows (see 2b).

---

## 5. Joining Company + Report Year Across Systems

- **Garbo:** Key is `Company.wikidataId` + `ReportingPeriod.year`.
- **Pipeline-api:** Process has `companyName`, `reportYear`; no `wikidataId` in the process API response today.
- **Join strategies:**  
  - **By name + year:** Match pipeline process `(companyName, reportYear)` to Garbo company name (fuzzy or exact) and then to `ReportingPeriod.year`. Risk: duplicate or similar company names.  
  - **By wikidataId:** If pipeline job data (and process API) expose `wikidataId` (e.g. from guess-wikidata step), join Garbo on `wikidataId` + year. More reliable; recommend adding `wikidataId` to process list response for status overview.

---

## 6. Filtering (Multi-Select)

- **By tag:** Garbo `Company.tags`; today company list has no server-side filter by tag — either add `?tags=slug1,slug2` to Garbo companies or status-overview endpoint, or filter client-side after fetching.
- **By company name:** Search / autocomplete; can use Garbo `GET /api/companies/search?q=...` or filter in memory.
- **By report year(s):** Multi-select (e.g. 2022, 2023, 2024); filter rows where `year` in selected set.
- **By pipeline status:** e.g. “Has errors”, “Pending”, “Completed” (filter by column 2/3).
- **By verification:** e.g. “Unverified in prod” (filter by column 5).

If aggregation stays in Validate (Option A), all filtering is client-side. If a status-overview API is added in Garbo (Option B), these can be query params for server-side filtering and smaller payloads.

---

## 7. UI Sketch: Table View

- **Table:** One row per (company, report year). Columns: Company name, Year, Report, Pipeline run, Pipeline errors, Data in prod, Emissions verified (prod), Data in stage. Optional: Tags (for display/filter).
- **Cells:** Icon only (✓, !, ⏱, –) or icon + short tooltip (e.g. “Verified” / “Unverified” / “Failed: parse step”). Report column can show a link when present.
- **Filters:** Multi-select dropdowns or chips for Tags, Report years, Company (search + select). Optional: Pipeline status, Verification status. “Clear filters” and optional “Save filter set” later.
- **Export:** CSV/Excel export of the same rows and columns so the tab can replace current Excel sheets.

---

## 8. Implementation Order (Suggested)

1. **Document and align** on this proposal (icons, columns, ownership of aggregation).
2. **Validate: Status Overview tab (Option A)**  
   - New tab “Status overview” (or “Status”).  
   - Fetch Garbo prod companies (with reporting periods); build master list of (company, year).  
   - Fetch pipeline `/processes/companies` (and process details for error flag); match by company name + year.  
   - Fetch Garbo stage companies; match by wikidataId + year.  
   - Render table with icon semantics; add client-side filters (tag, year, company name).
3. **Garbo: Report registry as master list (Section 4)**  
   - New table `Report` + `GET/POST/PATCH /api/reports/registry`.  
   - Wire crawler "Save to list," link upload, and file upload to create rows; add match step or pipeline reportId to link to Company/ReportingPeriod.  
   - Use registry in Status Overview as row source and for "Report" column + link + comments.
4. **Pipeline-api (optional):** Expose `wikidataId` in process list for more reliable join.
5. **Later:** Garbo status-overview endpoint (Option B) and server-side filtering if needed for scale or performance.

---

## 9. Summary

| Item | Proposal |
|------|----------|
| **Row** | One per (company, report year) |
| **Columns** | Report, Pipeline run, Pipeline errors, Data in prod, Emissions verified (prod), Data in stage |
| **Icons** | ✓ done, ! issue, ⏱ pending, – N/A |
| **Aggregation** | Start in Validate (Option A); later optional Garbo status-overview API (Option B) |
| **Report “Do we have one?”** | Garbo report registry as **master list** (table + endpoints); crawler/upload create rows; link to Company/ReportingPeriod when wikidataId known; optional comments |
| **Join** | Name + year initially; add wikidataId in pipeline process API for robustness |
| **Filtering** | Multi-select by tag, company name, report years (client-side first; server-side if Garbo endpoint added) |

This gives a single, high-level status view that can replace Excel and combine pipeline, prod, stage, and verification in one place. The **report registry as master list** (Sections 2b, 2c, 4) closes the data-flow gap from crawler/upload through to pipeline and Garbo, with optional comments for manual review and a clear path to optional backend aggregation later.
