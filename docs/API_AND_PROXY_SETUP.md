# API and proxy setup

How Validate talks to **pipeline**, **Unearth API**, and **Garbo monolith** in development and production.

## Overview

| Backend | Host (stage) | Browser path (deployed) |
|---------|----------------|-------------------------|
| **Pipeline API** | `stage-pipeline-api.klimatkollen.se` | `/api/…` |
| **Unearth API** | `stage-api.unearthdata.ai` | `/unearth-api/…` |
| **Garbo monolith** | `stage-api.klimatkollen.se` | `/garbo-api/queue-archive/…` only |

- **Errors tab** – always compares Unearth stage and prod via `/unearth-stage-api/` and `/unearth-prod-api/` (ignores target).

In **development**, Vite proxies same-origin paths (see network tab table below).

---

## Network tab paths (dev)

| Path | Backend |
|------|--------|
| `/pipeline-local` | Pipeline on this machine |
| `/pipeline-stage` | Stage pipeline |
| `/pipeline` | Prod pipeline |
| `/unearth-local` | Local API (Unearth; often localhost:3000) |
| `/unearth-stage` | Stage Unearth |
| `/unearth` | Prod Unearth |
| `/garbo-local/api/queue-archive` | Local Garbo monolith |
| `/garbo-stage/api/queue-archive` | Stage Garbo monolith |
| `/garbo/api/queue-archive` | Prod Garbo monolith |

Deployed builds use `/unearth-api` and `/garbo-api/queue-archive` instead.

---

## Usage cases

### 1. Errors tab

Fetches **both** Unearth stage and prod. Paths: `/unearth-stage/…` (dev) or `/unearth-stage-api/…` (deployed), and `/unearth/…` or `/unearth-prod-api/…`.

### 2. Unearth target – auth, crawler, registry

One Unearth backend from `VITE_UNEARTH_TARGET` (legacy: `VITE_GARBO_TARGET`). Helpers: `getUnearthApiBaseUrl()`, `getUnearthTarget()`.

### 3. Garbo monolith – queue archive

Jobbstatus Archive, batch pickers, `POST /queue-archive/batches`. Helper: `getGarboQueueArchiveUrl()` → `/garbo-api/queue-archive/…` (deployed) or `/garbo-stage/api/queue-archive/…` (dev).

Requires JWT from Unearth login (`garboAuthFetch`); monolith must share `JWT_SECRET` with Unearth.

### 4. Pipeline target – live job status

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
| `VITE_API_MODE` | Joint default for pipeline + Unearth/Garbo |
| `VITE_UNEARTH_TARGET` | Unearth + Garbo archive target (`local` \| `stage` \| `prod`) |
| `VITE_PIPELINE_TARGET` | Pipeline only |
| `VITE_UNEARTH_STAGE_URL` | Override Unearth stage host |
| `VITE_GARBO_STAGE_URL` | Override Garbo monolith stage host |
| `UNEARTH_API_URL` | nginx → Unearth (includes `/api` suffix) |
| `GARBO_API_URL` | nginx → Garbo monolith (includes `/api` suffix) |
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
