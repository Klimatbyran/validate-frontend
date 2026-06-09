# API and proxy setup

How Validate talks to **Pipeline API**, **Unearth API**, and **Garbo API** in development and production.

## Overview

| Backend | Host (stage) | Browser path (deployed) |
|---------|----------------|-------------------------|
| **Pipeline API** | `stage-pipeline-api.klimatkollen.se` | `/api/…` |
| **Unearth API** | `stage-api.unearthdata.ai` | `/unearth-api/…` |
| **Garbo API** | `stage-api.klimatkollen.se` | `/garbo-api/queue-archive/…` only |

- **Errors tab** – always compares stage and prod **Unearth API** via `/unearth-stage-api/` and `/unearth-prod-api/` (ignores target).

In **development**, Vite proxies same-origin paths (see network tab table below).

---

## Network tab paths (dev)

| Path | Backend |
|------|--------|
| `/pipeline-local` | Pipeline API on this machine |
| `/pipeline-stage` | Stage Pipeline API |
| `/pipeline` | Prod Pipeline API |
| `/unearth-local` | Local Unearth API (often localhost:3000) |
| `/unearth-stage` | Stage Unearth API |
| `/unearth` | Prod Unearth API |
| `/garbo-local/api/queue-archive` | Local Garbo API |
| `/garbo-stage/api/queue-archive` | Stage Garbo API |
| `/garbo/api/queue-archive` | Prod Garbo API |

Deployed builds use `/unearth-api` and `/garbo-api/queue-archive` instead.

---

## Usage cases

### 1. Errors tab

Fetches **both** stage and prod **Unearth API** via staff pipeline company lists (all reporting periods):

- Stage: `getStagePipelineCompaniesListUrl()` → `/unearth-stage/api/pipeline/companies` (dev) or `/unearth-stage-api/api/pipeline/companies` (deployed)
- Prod: `getProdPipelineCompaniesListUrl()` → `/unearth/api/pipeline/companies` (dev) or `/unearth-prod-api/api/pipeline/companies` (deployed)

Requires login (Bearer JWT). **Production Unearth API** must expose `GET /api/pipeline/companies`; until deploy prod may return 404. Override: `VITE_ERRORS_PROD_PIPELINE_URL=/unearth-stage/api/pipeline/companies`.

### 2. Unearth API – auth, crawler, registry

One Unearth API backend from `VITE_UNEARTH_TARGET` (legacy: `VITE_GARBO_TARGET`). Helpers: `getUnearthApiBaseUrl()`, `getUnearthTarget()`.

### 3. Garbo API – queue archive

Jobbstatus Archive, batch pickers, `POST /queue-archive/batches`. Helper: `getGarboQueueArchiveUrl()` → `/garbo-api/queue-archive/…` (deployed) or `/garbo-stage/api/queue-archive/…` (dev).

Requires JWT from Unearth API login (`garboAuthFetch`); Garbo API must share `JWT_SECRET` with Unearth API.

### 4. Pipeline API – live job status

`getPipelineApiBaseUrl()` → `/pipeline-stage`, etc.

---

## Jobbstatus Archive endpoints

- `GET /queue-archive/batches`
- `POST /queue-archive/batches` – `{ "batchName": string }`
- `GET /queue-archive/runs`
- `GET /queue-archive/runs/:threadId`

See [routing / URL state](./ROUTING_URL_STATE.md#jobbstatus-live-vs-archive).

---

## Environment variables

See `.env.development.example`.

| Variable | Purpose |
|----------|---------|
| `VITE_API_MODE` | Joint default for Pipeline API + Unearth/Garbo API |
| `VITE_UNEARTH_TARGET` | Unearth API + Garbo API archive target (`local` \| `stage` \| `prod`) |
| `VITE_PIPELINE_TARGET` | Pipeline API only |
| `VITE_UNEARTH_STAGE_URL` | Override Unearth API stage host |
| `VITE_GARBO_STAGE_URL` | Override Garbo API stage host |
| `UNEARTH_API_URL` | nginx → Unearth API (includes `/api` suffix) |
| `GARBO_API_URL` | nginx → Garbo API (includes `/api` suffix) |
| `GARBO_ALL_ACCESS_API_KEY` | `/unearth-api/` (primary deployment target) |
| `GARBO_STAGE_ALL_ACCESS_API_KEY` | `/unearth-stage-api/`, `/garbo-api/queue-archive/` |
| `GARBO_PROD_ALL_ACCESS_API_KEY` | `/unearth-prod-api/` |

---

## Klimatkollen frontend origin

`GARBO_STAGE_ORIGIN` / `GARBO_PROD_ORIGIN` – web app links only, not API hosts.

---

## Reference

- `src/config/api-env.ts` – `getUnearthApiBaseUrl()`, `getGarboApiBaseUrl()`, `getGarboQueueArchiveUrl()`, `getStageUnearthUrl()`, `getProdUnearthUrl()`
- `vite.config.ts` – dev proxies
- `nginx.conf.template` – deployed proxies
