# API and proxy setup

This doc describes how the app talks to the **pipeline** and **garbo** backends in development and production, and how to switch between local, stage, and prod.

## Overview

- **Pipeline** – job status, upload, batches, queues (validate/pipeline API).
- **Garbo** – auth, crawler reports, companies (Klimatkollen garbo API).
- **Error browser** – always calls both garbo stage and garbo prod for comparison; no “target” setting.

In **development**, the Vite dev server proxies request paths to the right backend. The path you see in the **network tab** is the backend you’re hitting (e.g. `/pipeline-stage`, `/garbo-local`).

In **production**, the app uses full API URLs (garbo) or `/api` (pipeline); there is no Vite proxy.

---

## What you see in the network tab

| Path | Backend |
|------|--------|
| `/pipeline-local` | Pipeline on this machine (e.g. localhost:3001) |
| `/pipeline-stage` | Stage pipeline API |
| `/pipeline` | Prod pipeline API |
| `/garbo-local` | Garbo on this machine (e.g. localhost:3000) |
| `/garbo-stage` | Stage garbo API |
| `/garbo` | Prod garbo API |

So you can tell at a glance which pipeline and which garbo you’re using without opening `.env`.

---

## The three cases

### 1. Error browser – always stage and prod

The Errors tab always fetches from **both** garbo stage and garbo prod (for comparison). It does not use the “garbo target” setting. Paths: `/garbo-stage/...` and `/garbo/...` (prod).

### 2. Garbo single target – auth, crawler, etc.

Auth, crawler (reports/list, etc.) and any other “single” garbo usage hit **one** garbo backend, chosen by your target. Default is **stage**. Overridable by env (see below). Path in network tab: `/garbo-local`, `/garbo-stage`, or `/garbo`.

### 3. Pipeline single target – job status, upload, etc.

Job status, upload, batches, queues all hit **one** pipeline backend. Default is **stage**. Overridable by env. Path in network tab: `/pipeline-local`, `/pipeline-stage`, or `/pipeline`.

---

## Environment variables

Copy `.env.development.example` to `.env.development` or `.env.development.local` and uncomment or set what you need.

### Joint override (sets both pipeline and garbo)

If you don’t set per-backend overrides, both pipeline and garbo use this:

- `VITE_API_MODE=stage` (default)
- `VITE_API_MODE=local`
- `VITE_API_MODE=prod`

### Per-backend overrides

Override pipeline or garbo independently:

- `VITE_PIPELINE_TARGET=local` | `stage` | `prod` – pipeline only
- `VITE_GARBO_TARGET=local` | `stage` | `prod` – garbo only

Example: pipeline to stage, garbo to local:

```bash
VITE_PIPELINE_TARGET=stage
VITE_GARBO_TARGET=local
```

### URL overrides (optional)

By default, local/stage/prod URLs are fixed (e.g. stage-api.klimatkollen.se for garbo stage). To point at a different host:

- Pipeline: `VITE_PIPELINE_API_URL`, `VITE_PIPELINE_STAGE_URL`, `VITE_PIPELINE_PROD_URL`
- Garbo: `VITE_GARBO_LOCAL_URL`, `VITE_GARBO_STAGE_URL`, `VITE_GARBO_PROD_URL`
- Screenshots: `VITE_SCREENSHOTS_API_URL`

---

## How to use

1. **Set your targets** in `.env.development` or `.env.development.local` (e.g. `VITE_API_MODE=stage` or per-backend overrides).
2. **Start the dev server**: `npm run dev`.
3. **Check the terminal** – you’ll see which pipeline and garbo targets are active and their URLs.
4. **Check the browser console** (DevTools) – on load you’ll see e.g. `[validate] garbo target: stage | pipeline target: stage`.
5. **Check the network tab** – pipeline requests will show `/pipeline-local`, `/pipeline-stage`, or `/pipeline`; garbo requests will show `/garbo-local`, `/garbo-stage`, or `/garbo`.

When you change `.env`, **restart the dev server** so the proxy and app config pick up the new values. Env is read when the dev server starts.

**If garbo still hits stage when you set local:**  
1. Use the exact variable **`VITE_GARBO_TARGET=local`** (not `GARBO_TARGET`; the `VITE_` prefix is required for the app to see it).  
2. Put it in **`.env.development`** or **`.env.development.local`** in the project root (copy from `.env.development.example` if needed).  
3. Restart the dev server (`npm run dev`).  
4. In the browser console on load you should see `[validate] garbo target: local | pipeline target: ...`. In the network tab, garbo requests should go to `http://localhost:5173/garbo-local/...`.

---

## Garbo: API base vs frontend origin

Garbo uses two kinds of URLs (per garbo team):

- **API base** (stage-api / api) – used for all backend calls (reports, companies, auth).  
  Stage: `https://stage-api.klimatkollen.se`  
  Prod: `https://api.klimatkollen.se`
- **Frontend origin** (stage / klimatkollen) – used when the app needs to link to the Klimatkollen **web app** (e.g. “back to site” links, not API calls).  
  Stage: `https://stage.klimatkollen.se`  
  Prod: `https://klimatkollen.se`

The app uses the API base for requests and the origin constants (`GARBO_STAGE_ORIGIN`, `GARBO_PROD_ORIGIN`) only where it needs to point users at the frontend app.

In **production**, the app uses relative paths for both backends: `/api` (pipeline) and `/garbo-api` (Garbo). Nginx in the container proxies these to the backends (per `BACKEND_API_URL` and `GARBO_API_URL` in k8s), so the browser only talks to the same origin and CORS is not required. Stage vs prod is determined by the deployment overlay (staging vs production) setting those env vars. If you ever call Garbo from a different origin (e.g. Errors tab comparing stage and prod), see **[Garbo CORS requirements](GARBO_CORS_REQUIREMENTS.md)**.

---

## Reference

- **Config and helpers**: `src/config/api-env.ts` – `getPipelineTarget()`, `getGarboTarget()`, `getPipelineApiBaseUrl()`, `getPipelineUrl()`, `getGarboApiBaseUrl()`, `getStageGarboUrl()`, `getProdGarboUrl()`.
- **Proxy definition**: `vite.config.ts` – proxy targets and path rewrites.
- **Example env**: `.env.development.example` – all supported variables and short comments.
