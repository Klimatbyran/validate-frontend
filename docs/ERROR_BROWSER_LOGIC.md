## Error Browser logic (Validate)

This document explains how the Error Browser tab computes comparisons and metrics. It exists to make maintenance safe when the Stage/Prod schemas and verification rules evolve.

### Data sources

- **Stage**: `getStagePipelineCompaniesListUrl()` → Unearth `GET /api/internal-pipeline/companies` (X-API-Key via validate proxy)
- **Prod**: `getProdPipelineCompaniesListUrl()` → Unearth `GET /api/internal-pipeline/companies` on prod host
- Pipeline endpoints return **all** reporting period rows per company (not the public one-period-per-data-year view).
- **Deployment**: both stage and prod **Unearth API** must expose `GET /api/internal-pipeline/companies`.
- The UI always fetches _both_ and compares them client-side.

Key implementation: `src/tabs/errors/hooks/useErrorBrowserData.ts`.

### Core concepts

- **Company union**: most views start from the union of company ids across Stage and Prod. Pairing prefers `wikidataId`, then unique shared report `sha256` / URL when Wikidata is missing on one side.
- **Reporting period selection**: for a selected **data year**, `pickReportingPeriodsForFilters(...)` matches the DB `year` field (via `getPeriodDataYear`). Optional **report year** filters by PDF catalog year on `CompanyReport`.
- **Multiple rows per company**: when several report shells have data for the same data year, the browser shows one comparison row per shell (matched by stable report identity — `reportSha256`, report URL, or catalog/data year — not env-local `companyReportId`).
- **Discrepancy classification**:
  - `report-absent` / `report-extra`: one environment has the report shell, the other does not (run / sync reports).
  - `missing` / `hallucination`: both shells exist; a value is present on only one side (extraction gap).
  - Other types (`error`, `rounding`, `category-error`, …) compare values when both shells exist.
- **Prod verification**: a data point is considered verified when Prod metadata indicates it (see `getDataPointVerified(...)` in `src/tabs/errors/lib/emissions.ts`).

### Views and what they are allowed to filter

The Error Browser supports multiple views:

- **Browser**: shows a company table for a selected data point (Stage value vs Prod value).
- **Overview**: shows aggregate accuracy across many data points (graphic) and a table view (table).
- **Worst**: shows “hardest reports” (companies with the most errors across all data points).

The following user filters exist globally:

- **Year**
- **Tags**

These filters affect the fetched company sets and thus all views.

### “Verified only” toggle

Because not every Prod data point will be verified going forward, we support a toggle:

- **Verified only (Prod)**: when enabled, _accuracy metrics_ are computed only using comparisons where Prod is verified for that specific data point.

When enabled, it also filters some views to avoid mixing verified and unverified “truth”.

### Eligibility rules for accuracy calculations

When **Verified only** is OFF:

- Accuracy is computed from all comparisons where the company exists in both APIs and both have a reporting period for the selected year.

When **Verified only** is ON:

- A company×data-point slot is eligible for accuracy **only if**:
  - the company exists in both Stage and Prod
  - both have a reporting period for the selected year
  - **Prod is verified for that data point**

Non-eligible slots are excluded from both numerators and denominators.

Notes:

- **Zero-inclusive special case**: in verified-only mode, `both-null` slots can still be included _for the zero-inclusive calculation_ when the company’s Prod reporting period for the selected year is otherwise “fully verified” (all present emissions data points verified; `calculated-total` ignored). This keeps zero-inclusive meaningful while still using verified truth.

### Where the toggle is applied in code

- **Browser “Performance Metrics”**:
  - Computed by `computePerformanceMetrics(...)` in `src/tabs/errors/lib/metrics.ts`
  - When verified-only is enabled:
    - Exact / Precision‑tolerant metrics filter to rows where `prodVerified === true` _for the currently selected data point_.
    - Zero-inclusive additionally allows `both-null` rows when `prodCompanyVerifiedForYear === true`.
- **Overview data point metrics**:
  - Computed in `allDataPointMetrics` inside `useErrorBrowserData`
  - When verified-only is enabled, it skips a company×data-point comparison unless:
    - `getDataPointVerified(prodRP.emissions, dp.id)` is true, OR
    - Stage+Prod are both null **and** the company is fully verified for the year (zero-inclusive context-verified nulls).

### Browser table + Hardest Reports behavior when enabled

- **Browser company table**: when verified-only is enabled, the company table is filtered to rows where:
  - `prodVerified === true`, OR
  - discrepancy is `both-null` and `prodCompanyVerifiedForYear === true` (context-verified nulls)

- **Hardest Reports**: when verified-only is enabled, error counting is performed only over eligible (verified) comparisons using the same eligibility rules as metrics.

### What is intentionally not changed

- **Company list construction** still starts from the union of stage/prod ids and tag filtering; the toggle only constrains which comparisons contribute to metrics and certain views.
