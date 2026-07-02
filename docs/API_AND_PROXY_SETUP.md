# API and proxy setup

How Validate talks to **Pipeline API**, **Unearth API**, and **Garbo API** in development and production.

## Overview

| Backend          | Host (stage)                         | Browser path (deployed)           |
| ---------------- | ------------------------------------ | --------------------------------- |
| **Pipeline API** | `stage-pipeline-api.klimatkollen.se` | `/api/…`                          |
| **Unearth API**  | `stage-api.unearthdata.ai`           | `/unearth-api/…`                  |
| **Garbo API**    | `stage-api.klimatkollen.se`          | `/garbo-api/queue-archive/…` only |

- **Errors tab** – always compares stage and prod **Unearth API** via `/unearth-stage-api/` and `/unearth-prod-api/` (ignores deployment target).
- **Overview tab** – paginated views from Unearth `GET /internal-validate-overview/*` (X-API-Key via proxy; aggregation is server-side).

In **development**, Vite proxies same-origin paths (see network tab table below).

---

## Network tab paths (dev)

| Path                             | Backend                                  |
| -------------------------------- | ---------------------------------------- |
| `/pipeline-local`                | Pipeline API on this machine             |
| `/pipeline-stage`                | Stage Pipeline API                       |
| `/pipeline`                      | Prod Pipeline API                        |
| `/unearth-local`                 | Local Unearth API (often localhost:3000) |
| `/unearth-stage`                 | Stage Unearth API                        |
| `/unearth`                       | Prod Unearth API                         |
| `/garbo-local/api/queue-archive` | Local Garbo API                          |
| `/garbo-stage/api/queue-archive` | Stage Garbo API                          |
| `/garbo/api/queue-archive`       | Prod Garbo API                           |

Deployed builds use `/unearth-api` and `/garbo-api/queue-archive` instead.

---

## Usage cases

### 1. Errors tab

Fetches **both** stage and prod **Unearth API** via internal pipeline company lists (all reporting periods):

- Stage: `getStagePipelineCompaniesListUrl()` → `/unearth-stage/api/internal-pipeline/companies` (dev) or `/unearth-stage-api/api/internal-pipeline/companies` (deployed)
- Prod: `getProdPipelineCompaniesListUrl()` → `/unearth/api/internal-pipeline/companies` (dev) or `/unearth-prod-api/api/internal-pipeline/companies` (deployed)

Requires `X-API-Key` (injected by the Validate proxy). Both stage and prod **Unearth API** must expose `GET /api/internal-pipeline/companies`.

### 2. Unearth API – auth, crawler, registry

One Unearth API backend from `VITE_UNEARTH_TARGET` (legacy: `VITE_GARBO_TARGET`). Helpers: `getUnearthApiBaseUrl()`, `getUnearthTarget()`.

### 3. Garbo API – queue archive

Jobbstatus Archive, batch pickers, `POST /queue-archive/batches`. Helper: `getGarboQueueArchiveUrl()` → `/garbo-api/queue-archive/…` (deployed) or `/garbo-stage/api/queue-archive/…` (dev).

Requires JWT from Unearth login (`garboAuthFetch`). Garbo also exposes the **same handler** at `/api/internal-queue-archive` (X-API-Key) for server callers (e.g. Unearth overview backend) — keep both: staff browser vs integration, not interchangeable auth.

### 4. Pipeline API – live job status

`getPipelineApiBaseUrl()` → `/pipeline-stage`, etc.

### 5. Overview tab

`getUnearthApiBaseUrl()` + `/internal-validate-overview/{company-years|registry-reports|prod-to-stage}` (X-API-Key via proxy). Overview aggregation is internal-only (no staff JWT route). Requires `reportYears` or `allYears`; default page size 50. Prod → Stage runs use `STAGE_RUN_REPORTS_PIPELINE_CONFIG` (stage pipeline + Garbo batches only).

The Unearth API loads companies via `GET /internal-pipeline/companies-overview` (local + peer). Deploy **stage and prod Unearth API together** so peer fetch does not 404. Registry-reports uses SQL pagination by default on the API; set `OVERVIEW_SQL_REGISTRY=0` on the Unearth pod to force the in-memory path.

The API may return `warnings` (non-fatal: peer env missing, inferred deployment env, etc.) alongside `rows` — the Overview tab surfaces these in a callout.

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

| Variable                         | Purpose                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `VITE_API_MODE`                  | Joint default for Pipeline API + Unearth/Garbo API                                               |
| `VITE_UNEARTH_TARGET`            | Unearth API + Garbo API archive target (`local` \| `stage` \| `prod`)                            |
| `VITE_PIPELINE_TARGET`           | Pipeline API only                                                                                |
| `VITE_UNEARTH_STAGE_URL`         | Override Unearth API stage host                                                                  |
| `VITE_GARBO_STAGE_URL`           | Override Garbo API stage host                                                                    |
| `UNEARTH_API_URL`                | nginx → Unearth API (includes `/api` suffix)                                                     |
| `GARBO_API_URL`                  | nginx → Garbo API (includes `/api` suffix)                                                       |
| `GARBO_ALL_ACCESS_API_KEY`       | `/unearth-api/` (primary deployment target)                                                      |
| `GARBO_STAGE_ALL_ACCESS_API_KEY` | `/unearth-stage-api/`, `/garbo-stage-api/queue-archive/` (dev: `/unearth-stage`, `/garbo-stage`) |
| `GARBO_PROD_ALL_ACCESS_API_KEY`  | `/unearth-prod-api/` (dev: `/unearth`)                                                           |

### Why three API key env vars?

Validate’s proxy maps **different browser paths to different backends** (stage vs prod hosts). Each nginx/Vite location needs an `X-API-Key` header, so three **variable names** are required even when the **same key string** is used everywhere.

| Variable                         | Proxied to                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `GARBO_ALL_ACCESS_API_KEY`       | Primary Unearth host for this deployment (`/unearth-api/`)                     |
| `GARBO_STAGE_ALL_ACCESS_API_KEY` | Fixed **stage** Unearth (`/unearth-stage-api/`) and stage Garbo queue-archive  |
| `GARBO_PROD_ALL_ACCESS_API_KEY`  | Fixed **prod** Unearth (`/unearth-prod-api/`) for Errors tab + cross-env reads |

You may set the **same** `garb_<lookup>.<secret>` value in all three if that key is seeded in **both** stage and prod databases with the permissions you need (`all-access` / integration). The names stay separate because the routes and hosts differ.

This is **not** the same as `GARBO_ALL_ACCESS_API_KEY` on the **Unearth API pod** — that env var is for Unearth’s own outbound calls (peer Garbo, seed), not for Validate’s browser proxy.

### Proxy timeouts

Unearth overview routes can take longer than generic API calls. nginx uses **120s** read timeout on `/unearth-api/`, `/unearth-stage-api/`, and `/unearth-prod-api/` (see `nginx.conf.template`). Vite uses a longer timeout on `/unearth-*` dev proxies for the same reason.

---

## Local Unearth API (`VITE_UNEARTH_TARGET=local`)

The `/unearth-local` Vite proxy does **not** inject `X-API-Key`. For local overview / internal routes without setting dev keys in Validate, run Unearth with:

```bash
ALLOW_ANONYMOUS_CLIENT_API=true
```

in the Unearth API `.env` (cutover / local dev only — never in production).

---

## Klimatkollen frontend origin

`GARBO_STAGE_ORIGIN` / `GARBO_PROD_ORIGIN` – web app links only, not API hosts.

---

## Reference

- `src/config/api-env.ts` – `getUnearthApiBaseUrl()`, `getGarboApiBaseUrl()`, `getGarboQueueArchiveUrl()`, `getStageUnearthUrl()`, `getProdUnearthUrl()`
- `vite.config.ts` – dev proxies
- `nginx.conf.template` – deployed proxies
