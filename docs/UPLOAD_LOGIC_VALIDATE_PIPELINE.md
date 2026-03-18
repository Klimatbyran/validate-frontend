# Upload Logic: Validate ↔ pipeline-api

Summary of how file uploads work between the Validate app and pipeline-api, and how they align.

---

## 1. Endpoint and path

| Side        | Value |
|------------|--------|
| **Validate** | `PARSE_PDF_UPLOAD_ENDPOINT` = `getPipelineUrl("/queues/parsePdf/upload")` → e.g. `/api/queues/parsePdf/upload` (prod) or `/pipeline-stage/queues/parsePdf/upload` (dev) |
| **pipeline-api** | Route `POST /parsePdf/upload` with prefix `/api/queues` → **`POST /api/queues/parsePdf/upload`** |

Paths match: Validate’s base URL is `/api` in prod (or `/pipeline-stage` etc. in dev), and the path is `/queues/parsePdf/upload`.

---

## 2. Validate: what is sent (file upload)

**Code:** `validate/src/tabs/upload/UploadTab.tsx` → `handleFileSubmit`

- **Method:** `POST`
- **Body:** `FormData` (multipart/form-data). Content-Type is **not** set so the browser sets the boundary.
- **Auth:** `authenticatedFetch` adds `Authorization: Bearer <token>` (see `validate/src/lib/api-helpers.ts`).

**Form fields:**

| Field               | Sent by Validate | Notes |
|---------------------|------------------|--------|
| **files**           | Yes              | Multiple: `formData.append("files", file)` per file. Field name is `"files"`. |
| **autoApprove**     | Yes              | `String(Boolean(autoApprove))` → `"true"` or `"false"`. |
| **forceReindex**    | Yes              | `String(Boolean(forceReindex))` → `"true"` or `"false"`. |
| **replaceAllEmissions** | Yes        | Always `"true"`. |
| **batchId**         | Conditionally    | Only if `effectiveBatchId` is set (existing batch id or custom name). |
| **runOnly**         | Conditionally    | When “run all workers” is off and at least one worker selected: `JSON.stringify(selectedWorkers)` → e.g. `"[\"parsePdf\",\"extractEmissions\"]"`. |

**Not sent on file upload:** `tags` (pipeline-api supports them; Validate does not send tags for file upload, only for URL-based add if you add that later).

---

## 3. pipeline-api: what is received (file upload)

**Code:** `pipeline-api/src/routes/readQueues.ts` → `POST /parsePdf/upload` handler

- **Multipart:** Uses `@fastify/multipart`. Limits: **400 MB per file**, **20 files** (see `app.ts` and `S3UploadService.PDF_MAX_BYTES`).
- **Auth:** `onRequest` hook requires JWT for write operations on `/api/queues`, so the same token Validate sends is validated.

**Form handling:**

- **Files:** Any part with `part.type === 'file'` is collected (field name is not checked). So both `file` and `files` are accepted. Validate uses `files` → OK.
- **Options (field parts):**
  - `autoApprove` → `value === 'true' || value === '1'`
  - `batchId` → string (empty → undefined)
  - `forceReindex` → `value === 'true' || value === '1'`
  - `replaceAllEmissions` → `value === 'true' || value === '1'`
  - `runOnly` → `JSON.parse(value)` (invalid JSON ignored)
  - `tags` → `JSON.parse(value)` (invalid JSON ignored)

**Processing:**

1. If S3 is not configured → **503** with message to set `S3_BUCKET`.
2. File size: multipart plugin rejects with **413** when a file exceeds 400 MB (message: “File too large. Maximum size is 400 MB per file.”). Validate maps 413 to `upload.fileTooLarge` toast.
3. For each file: upload buffer to S3 via `uploadPdfAndGetUrl(buffer, filename)` → get URL; then `queueService.addJob(QUEUE_NAMES.PARSE_PDF, url, options.autoApprove ?? false, { forceReindex, threadId: randomUUID(), replaceAllEmissions, runOnly, batchId, tags })`.
4. **One job per file;** each job gets its own `threadId` (UUID).
5. Response: **200** with body = **array of created jobs** (`addedJobs`). Schema: `queueAddJobResponseSchema` (array).

---

## 4. Alignment summary

| Item | Validate | pipeline-api | Match? |
|------|----------|--------------|--------|
| Path | `/api/queues/parsePdf/upload` (prod) | `POST /api/queues/parsePdf/upload` | Yes |
| File field name | `files` | Accepts any file part (`file` or `files`) | Yes |
| autoApprove | String `"true"`/`"false"` | Parsed as boolean | Yes |
| forceReindex | String `"true"`/`"false"` | Parsed as boolean | Yes |
| replaceAllEmissions | Always `"true"` | Parsed as boolean | Yes |
| batchId | Omitted or string | Optional string | Yes |
| runOnly | Omitted or JSON string array | Optional, `JSON.parse` | Yes |
| tags | Not sent | Optional, `JSON.parse` | Yes (optional) |
| Auth | Bearer JWT | JWT required for POST /api/queues | Yes |
| 413 (file too large) | Handled, toast | 413 + message | Yes |
| Response body | Not used (UI uses local state) | Array of jobs | OK |

No mismatches found: field names, types, and auth align. Validate does not read the response body (it clears the file list and adds `uploaded:${file.name}` to the URL list); the API still returns the array of jobs for possible future use (e.g. linking to Job status).

---

## 5. URL-based add (for comparison)

Validate’s **link** flow uses a different endpoint and body:

- **Endpoint:** `PARSE_PDF_API_ENDPOINT` = `getPipelineUrl("/queues/parsePdf")` → **POST /api/queues/parsePdf**.
- **Body:** JSON `{ urls, autoApprove, forceReindex, replaceAllEmissions, runOnly?, batchId? }`.
- pipeline-api: same route file, **POST /:name** with `name = parsePdf`, body schema `addQueueJobBodySchema` (urls array, etc.). One request can create multiple jobs (one per URL). File upload creates one job per file and returns an array; URL add can create many jobs in one call and returns a single job or array depending on implementation—check `queueAddJobResponseSchema` if you need the exact shape.

---

## 6. References

- **Validate:** `src/tabs/upload/UploadTab.tsx` (handleFileSubmit, lines ~41–101), `src/tabs/upload/lib/utils.ts` (endpoints), `src/config/api-env.ts` (base URL), `src/lib/api-helpers.ts` (authenticatedFetch).
- **pipeline-api:** `src/routes/readQueues.ts` (POST /parsePdf/upload, ~69–184), `src/app.ts` (multipart limits, route prefix), `src/services/S3UploadService.ts` (size constant, upload), `src/config/s3.ts` (S3 config), `src/services/QueueService.ts` (addJob).
