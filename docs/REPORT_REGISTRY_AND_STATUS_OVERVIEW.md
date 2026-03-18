# Report Registry & Status Overview — Design and Implementation

This document describes the **report registry** (master list of reports) and how it connects the **Crawler**, **Upload tab**, **Pipeline**, and **Status Overview** in Validate. It captures decisions made, the end-to-end flow, schema and usage, and future improvements.

---

## 1. Next Steps (Current State → Full Flow)

**Done so far:**

- **Garbo:** `Report` table extended with `source`, `comments`, `createdAt`, `updatedAt`; `GET /reports/db` for listing; `POST /reports/save-reports` creates rows (crawler sets `source: 'crawler'`).
- **Validate (Upload tab):** When user submits **link URLs**, we first `POST` to Garbo `/reports/save-reports` (companyName from URL hostname or "Unknown", reportYear "Unknown"), then send URLs to pipeline-api. Registry write is best-effort (does not block job creation).

**Next steps in order:**

| # | Step | Repo | What to do |
|---|------|------|------------|
| 1 | **Status Overview uses registry as row source** | Validate | In the 1134-table / Status Overview tab: fetch `GET /reports/db` from Garbo as the **master list** of rows. For each row, join to pipeline `/processes/companies` (by companyName + reportYear) for pipeline run/errors, and to Garbo prod/stage for data-in-prod, data-in-stage, verification. Render table with proposal columns (Report, Pipeline run, Pipeline errors, Data in prod, Emissions verified, Data in stage). |
| 2 | **Pipeline-api: carry `reportId` in job data** | pipeline-api | When creating jobs (URL or file), accept optional `reportId` per item; store it in `job.data.reportId`. Validate can send `reportId` when it has one (e.g. after creating a registry row and getting back `id`). |
| 3 | **Garbo: `ReportingPeriod.reportId` + accept in API** | Garbo | Add optional `reportId` (FK to `Report.id`) on `ReportingPeriod`. When pipeline `saveToAPI` (or equivalent) sends reporting-periods payload, accept optional `reportId` and persist it. Optionally back-fill the `Report` row with `companyId` and `reportingPeriodId` when the period is created. |
| 4 | **Validate: send `reportId` when queueing from registry** | Validate | When creating a registry row before queueing (link upload), use the created report `id` and pass it into the pipeline-api add-job request so the job carries `reportId` end-to-end. |
| 5 | **Crawler → registry** | Validate (separate PR) | Ensure crawler "Save to list" uses `POST /reports/save-reports` so crawler-found reports appear in the same master list. |
| 6 | **Optional: PATCH report (comments)** | Garbo | Add `PATCH /reports/:id` for `comments` (and later wikidataId) so the overview can show and edit manual notes. |
| 7 | **File upload → registry** | Validate + pipeline-api | When file upload is implemented, create a registry row (e.g. with S3 URL when available) and optionally pass `reportId` into the job. |

---

## 2. Decisions We Made and Why

### 2.1 Report registry lives in Garbo (not pipeline-api)

- **Decision:** The master list of "reports we know about" is the Garbo `Report` table and its endpoints.
- **Why:** Garbo already owns companies and reporting periods. The overview needs to join "report" → "company/reporting period" and "data in prod/stage"; keeping the registry in Garbo avoids pipeline-api having to depend on Garbo for prod/stage data. One place for "report + company linkage" is simpler.

### 2.2 Reuse existing `Report` table (no separate "ReportRegistry" table)

- **Decision:** Extend the existing Garbo `Report` model (from the 1134-table branch) with `source`, `comments`, timestamps rather than creating a second table.
- **Why:** Less schema and API surface; one concept ("a report we know about") in one table. The unique constraint `(companyName, reportYear)` remains; we allow "Unknown" for uploads where we don't have company/year yet.

### 2.3 Reuse existing save endpoint for uploads (Option A)

- **Decision:** Upload tab calls the same Garbo endpoint `POST /reports/save-reports` that the crawler uses, with `companyName` (from URL or "Unknown") and `reportYear: "Unknown"` when we don't have it.
- **Why:** Avoids a duplicate endpoint; the body already supports the fields we need. We can add optional `source` to the request later so Garbo can store `link_upload` vs `crawler`; until then, crawler sets `source: 'crawler'` server-side, and upload-created rows can stay without source or get a default.

### 2.4 Company name and report year optional for uploads

- **Decision:** Allow `companyName` and `reportYear` to be placeholders (e.g. "Unknown") when creating registry rows from the upload tab. We do not require the upload UI to collect company/year before submitting.
- **Why:** Upload flow stays simple; we don't block on UI changes. Once the pipeline infers company/year (and wikidataId), we can link the registry row later (e.g. by matching or by passing `reportId` through the pipeline).

### 2.5 Registry write is best-effort on upload

- **Decision:** When the upload tab submits URLs, we first POST to Garbo save-reports; if that fails, we log and still send the request to pipeline-api. We do not block job creation on registry success.
- **Why:** Pipeline progress is the primary goal; the registry is an improvement for visibility and overview. Degrading gracefully avoids one failing system blocking the other.

### 2.6 No delete/cascade for reports (for now)

- **Decision:** We did not add DELETE or cascade-delete from Report to ReportingPeriod. No soft-delete flag yet.
- **Why:** Deleting a report that already has a linked reporting period and emissions is a heavy, ambiguous operation. We deferred until there is a clear product need; then we can design soft-delete or an explicit "unlink/reset" flow.

### 2.7 Status Overview rows = registry rows (master list)

- **Decision:** The Status Overview table is built from the report registry (GET /reports/db). Each row is one registry entry; we enrich with pipeline and Garbo prod/stage data by joining on company name + year (and later reportId when available).
- **Why:** One source of truth for "what reports do we know about"; the overview shows the full journey from discovery/upload through pipeline to prod/stage.

---

## 3. End-to-End Flow

### 3.1 High-level

```
[Crawler]  →  POST /reports/save-reports  →  Report row (source: crawler)
[Upload links] → POST /reports/save-reports → Report row(s) (company/year from URL or "Unknown")
                    ↓
              POST /queues/parsePdf (urls)  →  Pipeline jobs
                    ↓
              Pipeline runs (parse → … → saveToAPI)
                    ↓
              Garbo: Company + ReportingPeriod created/updated (reportURL, etc.)
                    ↓
[Status Overview]  ←  GET /reports/db  (master list) + pipeline processes + Garbo prod/stage
```

### 3.2 Crawler path (separate PR)

- User runs crawler, selects/locks reports, chooses "Save to list".
- Validate calls Garbo `POST /reports/save-reports` with `{ companyName, reportYear, url }` per report (and optionally `source: 'crawler'` if we add it to the body). Garbo creates/updates `Report` rows.
- No pipeline job is created by this step; the report simply appears in the registry. User can later send the same URL through the Upload tab to run the pipeline.

### 3.3 Upload tab (links)

- User pastes URLs and submits.
- Validate (in order):
  1. **Registry:** POST to Garbo `/reports/save-reports` with one object per URL: `companyName: extractCompanyFromUrl(url)` or "Unknown", `reportYear: "Unknown"`, `url`. Best-effort; failures are logged only.
  2. **Pipeline:** POST to pipeline-api `/queues/parsePdf` with the same URLs and options (autoApprove, batchId, runOnly, etc.).
- Pipeline runs as today; when it finishes, Garbo has Company + ReportingPeriod. The registry row already exists and can later be linked (e.g. by reportId or by matching company/year/URL).

### 3.4 File upload (future)

- User uploads files; pipeline-api uploads to S3 and enqueues parse jobs.
- Today: no registry row is created for file uploads. Future: create a Report row (e.g. with S3 URL and source `file_upload`) when we have a stable way to get the URL/key back into Validate or when pipeline-api can call Garbo to register the report.

### 3.5 Status Overview

- Tab fetches:
  - **Master list:** Garbo `GET /reports/db` → list of Report rows (id, companyName, reportYear, url, source, comments, …).
  - **Pipeline:** pipeline-api `/processes/companies` (or similar) for run status and errors.
  - **Garbo prod/stage:** companies and reporting periods for "data in prod", "data in stage", "emissions verified".
- Each row in the table = one Report. Columns show: Report (link), Pipeline run, Pipeline errors, Data in prod, Emissions verified, Data in stage. Joins by company name + report year (and optionally reportId once we pass it through the pipeline).

---

## 4. Table Schema and Usage (Garbo)

### 4.1 `Report` table (master list)

| Field | Type | Purpose |
|-------|------|--------|
| `id` | cuid | Primary key; used as `reportId` when we pass it through the pipeline. |
| `companyName` | String | Display/organisation; may be "Unknown" for uploads until we have a company. |
| `wikidataId` | String? | Set when we know the company (e.g. after pipeline guess-wikidata). |
| `reportYear` | String | Year of the report; may be "Unknown" for uploads. |
| `url` | String | PDF URL (external or S3). |
| `source` | String? | Origin: `crawler`, `link_upload`, `file_upload` (optional, for filtering/display). |
| `comments` | String? | Manual notes (e.g. "Wrong PDF", "Needs re-parse"). |
| `createdAt` | DateTime | When the row was created. |
| `updatedAt` | DateTime | Last update. |

**Unique constraint:** `(companyName, reportYear)` — allows multiple URLs per company-year if we relax or change this later; for now we use it as a simple dedupe for crawler/save-reports.

**Usage:**

- **Create:** `POST /reports/save-reports` with array of `{ companyName, wikidataId?, reportYear, url }`. Garbo sets `source: 'crawler'` for this endpoint; upload can send same shape with companyName/year "Unknown".
- **List:** `GET /reports/db` returns all Report rows (e.g. for Status Overview and crawler "waiting room").
- **Update (future):** `PATCH /reports/:id` for comments (and optionally wikidataId, reportingPeriodId) when we add it.

### 4.2 `ReportingPeriod` (existing)

- Holds `reportURL`, `companyId` (wikidataId), `year`, and emissions/economy data.
- **Future:** optional `reportId` (FK to `Report.id`) so each period can point back to the registry row that originated it; enables joining overview and pipeline by reportId.

### 4.3 Linking report → company/reporting period

- **Today:** No FK from Report to ReportingPeriod. We join by (companyName, reportYear) or (wikidataId, year) in the overview.
- **Later:** When pipeline sends `reportId` in the save payload, Garbo can set `ReportingPeriod.reportId` and back-fill `Report.companyId` and `Report.reportingPeriodId` so the registry row is fully linked.

---

## 5. Theory: Why a Master List?

- **Single source of truth:** "Do we have a report for this company/year?" is answered by the registry, not by inferring from pipeline or Garbo alone. Crawler-found reports that haven’t been run through the pipeline yet still appear.
- **Traceability:** One row = one report we care about. We can attach pipeline status, prod/stage status, and comments to that row. Eventually, `reportId` ties the pipeline job and the ReportingPeriod back to the same row.
- **Separation of concerns:** Pipeline handles "run the pipeline"; Garbo handles "what reports exist" and "what’s in prod/stage". Validate orchestrates and presents the overview.
- **Incremental linking:** Reports can be created with minimal info (URL + Unknown company/year). As the pipeline or manual steps resolve company/year/wikidataId, we can update the same row and link it to ReportingPeriod.

---

## 6. Repos and Ownership

| Repo | Owns | Relevant endpoints / behaviour |
|------|------|--------------------------------|
| **Garbo** | Report table, companies, reporting periods, prod/stage data | `GET /reports/db`, `POST /reports/save-reports`, (future) `PATCH /reports/:id`, reporting-periods API with optional reportId |
| **Validate** | Crawler UI, Upload tab, Status Overview UI | Calls Garbo for registry; calls pipeline-api for jobs; builds overview from registry + pipeline + Garbo |
| **pipeline-api** | Job queues, process status | Accepts optional `reportId` in job data; passes it through to saveToAPI so Garbo can persist reportId on ReportingPeriod |
| **Bolt** | No change | — |

---

## 7. Future Improvements (Most to Least Impactful)

1. **Status Overview tab:** Use `GET /reports/db` as row source and add pipeline + Garbo prod/stage enrichment (columns per proposal). High impact: replaces Excel and gives a single view.
2. **reportId through pipeline:** Accept and store `reportId` in job data; Garbo accepts reportId when creating/updating reporting periods and sets `ReportingPeriod.reportId` (+ back-fill Report row). High impact: reliable join from overview to pipeline and to ReportingPeriod.
3. **Validate sends reportId when queueing:** After creating a registry row (link upload), pass returned `id` as `reportId` into pipeline-api so the job is tied to the report. Unlocks (2).
4. **Crawler "Save to list"** (separate PR): Ensure it uses `POST /reports/save-reports` so crawler-found reports appear in the same registry.
5. **PATCH /reports/:id:** Allow updating comments (and optionally wikidataId, reportingPeriodId) so reviewers can add notes and we can show them in the overview.
6. **File upload → registry:** When file upload is implemented, create a Report row (e.g. S3 URL, source `file_upload`) and optionally pass reportId into the job. Medium impact: file uploads appear in the master list too.
7. **Optional `source` in save-reports body:** Let client send `source` (crawler | link_upload | file_upload) so Garbo can store it; improves filtering and clarity in the overview.
8. **Server-side filtering on GET /reports/db:** Query params for year, companyName, source, tags (when Report is linked to Company). Medium impact for large lists.
9. **Auto-link helper:** Script or internal endpoint that matches unlinked Report rows to ReportingPeriods by companyName + reportYear or URL and sets companyId/reportingPeriodId (and reportId on ReportingPeriod). Lower priority once reportId flows through the pipeline.
10. **Soft-delete or explicit delete policy:** If we need to "remove" a report from the list without deleting ReportingPeriod data, add a flag or documented policy. Least urgent.

---

## 8. References

- **Proposal (columns, icons, aggregation options):** `docs/STATUS_OVERVIEW_PROPOSAL.md`
- **Upload ↔ pipeline behaviour:** `docs/UPLOAD_LOGIC_VALIDATE_PIPELINE.md`
- **Implementation plan (building blocks):** Previous implementation plan in chat; this doc is the single source for the "final" design and next steps.
