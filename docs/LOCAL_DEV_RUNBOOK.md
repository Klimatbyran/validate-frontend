# Local development runbook

How to run **Validate** against local or restored data, and when you need **Unearth API**, **Garbo**, or **Pipeline API**.

For proxy paths and env vars, see [API and proxy setup](./API_AND_PROXY_SETUP.md).

**Local auth:** set `ALLOW_ANONYMOUS_CLIENT_API=true` in `API/.env` and you can skip API keys in Validate. You still need GitHub OAuth login for the company editor. Stage/prod targets and the Errors tab need keys — see [Authentication & API keys](#authentication--api-keys).

### Dev scripts

| Script | What runs locally | Backends needed |
|--------|-------------------|-----------------|
| `npm run dev` / `dev:local` | Validate only | None (stage Unearth, stage pipeline, stage archive) |
| `npm run dev:local-db` | Validate + Unearth API | Unearth on :3000 |
| `npm run dev:local-db-pipeline` | Validate + Unearth + Pipeline | Unearth :3000, pipeline-api :3001 |
| `npm run dev:local-full` | Everything local | Unearth :3000, pipeline :3001, Garbo HTTP :3002 |

Queue archive uses **stage** in `dev:local-db` and `dev:local-db-pipeline` (`VITE_GARBO_ARCHIVE_TARGET=stage`). Only `dev:local-full` points archive at local Garbo (:3002). Errors tab is always stage + prod regardless of script.

Scripts use `cross-env` so the same commands work on macOS, Linux, and Windows (cmd/PowerShell).

---

## Quick answers

| Goal | What to run |
|------|-------------|
| Browse/edit companies against a restored prod DB | Postgres + Redis, **Unearth API** (`API` repo), Validate |
| Use stage/prod data without local backends | Validate only (default `VITE_API_MODE=stage`) |
| View/trigger **live** pipeline jobs | Above + **Pipeline API** + **Garbo workers** + Redis |
| **Jobbstatus Archive** tab against local DB | **Garbo API** on :3002 (`garbo npm run dev-api`) alongside Unearth on :3000 |
| Run a full report through Garbo locally | Containers (Postgres, Redis, Chroma, Docling), Garbo workers, Pipeline API, Unearth API for Validate UI |

**Unearth API** (company editor, auth) runs on port **3000**. **Garbo HTTP API** (queue archive, BullMQ dashboard) runs on port **3002**. They can run at the same time.

In production, Unearth API and Garbo share the same Postgres (`garbo` database). Locally, `API/docker-compose.yaml` is a convenience copy of Postgres + Redis — not a separate database product.

### Local ports

| Service | Port |
|---------|------|
| Unearth API (`API`) | 3000 |
| Pipeline API | 3001 |
| Garbo HTTP API (`garbo npm run dev-api` / `dev-board`) | 3002 |
| Validate | 5173 |

---

## Architecture (local)

```mermaid
flowchart LR
  subgraph validate["Validate (localhost:5173)"]
    V[Vite dev server]
  end

  subgraph backends["Backends"]
    U[Unearth API :3000]
    P[Pipeline API :3001]
    G[Garbo workers]
    GA[Garbo API :3002]
  end

  subgraph data["Data"]
    PG[(Postgres garbo)]
    R[(Redis)]
  end

  V -->|"/unearth-local"| U
  V -->|"/pipeline-local"| P
  V -->|"/garbo-local/queue-archive"| GA

  U --> PG
  GA --> PG
  P --> R
  G --> R
  G -->|"saveToAPI"| U
  G --> PG
```

Validate proxies `/unearth-local` → `localhost:3000` and `/garbo-local` → `localhost:3002`. Garbo **workers** POST company data to Unearth API (`API_BASE_URL` in `garbo/.env`), not to Garbo’s HTTP port.

---

## Prerequisites

- Node.js **22+** (Garbo, Unearth API)
- Node.js **23+** (Pipeline API)
- Docker (or Podman) for Postgres and Redis
- GitHub OAuth app credentials (for staff login in Validate)
- Optional: a `.dump` backup from the team (for realistic data)

Dev scripts (`npm run dev:local-db`, etc.) work on **Windows, macOS, and Linux** via `cross-env`.

---

## Scenario A — Browse restored prod data (most common)

Use this when you have a Postgres backup and want to explore it in Validate (company editor, registry, overview).

### 1. Start containers (once)

Use **one** compose file — both `API` and `garbo` define `garbo_postgres` / `garbo_redis` on the same ports. Do not run both.

```bash
cd API   # or garbo — either repo works
docker compose up -d
```

Default connection:

```
postgresql://postgres:mysecretpassword@localhost:5432/garbo
```

### 2. Restore backup (optional but typical)

```bash
# Drop existing DB if re-restoring
docker exec -i garbo_postgres dropdb -f -U postgres --if-exists garbo

# Restore (adjust path to your dump file)
docker exec -i garbo_postgres pg_restore -C -v -d postgres -U postgres < ~/Downloads/backup_garbo_XYZ.dump
```

If schema errors appear after restore, ensure your **Garbo** checkout matches the backup era and run migrations from Garbo:

```bash
cd garbo
npm run prisma migrate dev
```

See also `API/doc/COMPANY_ID_MIGRATION.md` if you are on the `Company.id` migration branch.

### 3. Start Unearth API

```bash
cd API
cp .env.example .env
```

Minimum `.env` for local browsing:

```env
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/garbo
API_SECRET=local-dev-secret
JWT_SECRET=local-dev-jwt-secret-long-enough
OPENAPI_PREFIX=reference
API_PORT=3000
API_BASE_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173
REDIS_HOST=localhost
REDIS_PORT=6379

# Easiest local dev — skip X-API-Key in Validate proxy (never use in prod)
ALLOW_ANONYMOUS_CLIENT_API=true

# GitHub OAuth (required by config even if you only test keyed reads)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_ORG=Klimatbyran
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
```

```bash
npm install
npm run dev
```

`npm run seed:client-api` is optional for Scenario A (only needed for `curl` with `X-API-Key`, or if `ALLOW_ANONYMOUS_CLIENT_API` is false).

Verify:

```bash
curl -s http://localhost:3000/reference/openapi.json | head -c 200
curl -s "http://localhost:3000/api/companies" -H "X-API-Key: YOUR_KEY" | head -c 200
```

Docs: http://localhost:3000/reference

### 4. Start Validate

```bash
cd validate
cp .env.development.example .env.development
npm run dev:local-db
```

Or set env manually: `VITE_UNEARTH_TARGET=local`, `VITE_PIPELINE_TARGET=stage`, `VITE_GARBO_ARCHIVE_TARGET=stage`.

```bash
npm install
```

Open http://localhost:5173. On startup, the terminal should log:

```
[vite] unearth target: local -> http://localhost:3000
[vite] garbo (queue-archive) target: stage -> https://stage-api.klimatkollen.se
```

Log in via GitHub OAuth (redirect goes through Unearth API).

---

### Optional: Garbo API (local archive or BullMQ dashboard)

Only needed for `npm run dev:local-full`, or if you override `VITE_GARBO_ARCHIVE_TARGET=local`:

```bash
cd garbo
cp .env.example .env
# API_PORT=3002 — Garbo HTTP server
# API_BASE_URL=http://localhost:3000/api — workers POST to Unearth (keep when both run)
npm run dev-api    # or npm run dev-board for /admin/queues
```

- OpenAPI / queue archive: http://localhost:3002/api
- BullMQ dashboard: http://localhost:3002/admin/queues

Unearth API must still be running on :3000 for Validate editor and for Garbo workers (`saveToAPI`).

---

## Scenario B — Default: stage backends only

No local API needed. Validate proxies to stage hosts.

```bash
cd validate
npm run dev
```

Default `VITE_API_MODE=stage` hits stage Unearth API, stage Garbo queue-archive, and stage Pipeline API. Requires API keys in Validate — see [API keys by scenario](#api-keys-by-scenario).

---

## Scenario C — Run reports through the pipeline locally

### 1. Containers

From **garbo** (includes Chroma; uncomment `docling` in `docker-compose.yaml` for local PDF parsing):

```bash
cd garbo
docker compose up -d
```

Set in `garbo/.env` if using local Docling:

```env
DOCLING_URL=http://localhost:5001/v1
DOCLING_USE_LOCAL=true
```

### 2. Unearth API + Validate

Follow [Scenario A](#scenario-a--browse-restored-prod-data-most-common) steps 3–4 so the editor and auth work.

### 3. Pipeline API

```bash
cd pipeline-api
cp .env.example .env   # or create .env
```

```env
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
NODE_ENV=development
JWT_SECRET=<same as Unearth API JWT_SECRET for write operations>
```

```bash
npm install
npm run dev
```

Docs: http://localhost:3001/api

### 4. Garbo workers

In a separate terminal:

```bash
cd garbo
npm run dev-workers
```

Optional: BullMQ dashboard for debugging (runs on Garbo HTTP port, alongside Unearth):

```bash
cd garbo
npm run dev-board   # Garbo API + queue admin on :3002
```

### 5. Validate targets

```bash
npm run dev:local-db-pipeline   # local Unearth + local pipeline; archive stays on stage
# or
npm run dev:local-full          # all local including Garbo archive on :3002
```

---

## Hybrid: local DB + stage services

Same as `npm run dev:local-db` (local Unearth, stage pipeline, **stage archive**):

```bash
npm run dev:local-db
```

- Company editor → local Unearth API → local Postgres
- Jobbstatus live jobs → stage Pipeline API
- Jobbstatus Archive → **stage** Garbo API (not local :3002)
- Errors tab → always stage + prod Unearth (independent of script)

---

## Environment reference

### Validate (`.env.development`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_MODE` | `local` \| `stage` \| `prod` — default for Unearth + Garbo archive target |
| `VITE_UNEARTH_TARGET` | Override Unearth API target only |
| `VITE_PIPELINE_TARGET` | Override Pipeline API target only |
| `VITE_GARBO_ARCHIVE_TARGET` | Override queue-archive target only (defaults to Unearth target) |
| `VITE_UNEARTH_LOCAL_URL` | Override local Unearth host (default `http://localhost:3000`) |
| `VITE_GARBO_LOCAL_URL` | Override local Garbo host (default `http://localhost:3002`) |

API key vars (`GARBO_*_ALL_ACCESS_API_KEY`, `ALLOW_ANONYMOUS_CLIENT_API`, seeding): [Authentication & API keys](#authentication--api-keys).

### Unearth API (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Points at `garbo` Postgres |
| `API_SECRET` | App secrets + API key hashing pepper |
| `JWT_SECRET` | Staff Bearer tokens; must match pipeline-api for writes |
| `ALLOW_ANONYMOUS_CLIENT_API` | `true` = skip `X-API-Key` on integration routes (local dev only) |
| `GITHUB_*` | OAuth — required by config validation |
| `OPENAPI_PREFIX` | Use `reference` locally (not `api`) |

Full proxy table: [API_AND_PROXY_SETUP.md](./API_AND_PROXY_SETUP.md).

---

## Troubleshooting

### `Failed to fetch company: 500` with stack trace under `garbo/src/api/...`

**Cause:** Validate’s company editor calls **Unearth API** (`/unearth-local` → :3000), but port 3000 is running **Garbo API** instead.

**Fix:** Run Unearth API from the `API` repo on :3000. Run Garbo HTTP API on :3002 (`garbo npm run dev-api`).

**Also check:** Company missing from DB (`findFirstOrThrow`):

```bash
docker exec -it garbo_postgres psql -U postgres -d garbo -c \
  "SELECT id, \"wikidataId\", name FROM \"Company\" WHERE \"wikidataId\" = 'Qxxxx' LIMIT 1;"
```

### Port already in use

```bash
lsof -i :3000   # Unearth API
lsof -i :3002   # Garbo HTTP API
```

Unearth API → **3000**. Garbo HTTP API → **3002**. Both can run together.

### Container name / port collision

`garbo_postgres` and `garbo_redis` are defined in both `API` and `garbo` compose files. Run **one** `docker compose up`. If containers already exist from the other repo, that is fine — they share the same names and volumes.

### Prisma / schema errors after restore

1. Migrations are owned by **Garbo** — run `npm run prisma migrate dev` in `garbo`, not `API`.
2. Match code branch to backup era (`Company.id` migration: `API/doc/COMPANY_ID_MIGRATION.md`).
3. Re-run `npm run seed:client-api` in `API` after adding new integration permissions.

### 401 on Validate API calls

See [Quick diagnosis](#quick-diagnosis) under Authentication & API keys. Common fixes: log in via GitHub OAuth (editor), or `ALLOW_ANONYMOUS_CLIENT_API=true` on local Unearth API (overview).

### Pipeline upload/rerun returns 401

`JWT_SECRET` in `pipeline-api/.env` must match Unearth API. Obtain JWT by logging into Validate (OAuth flow through Unearth API).

### Jobbstatus Archive empty or 404 locally

Start Garbo HTTP API on :3002 (`garbo npm run dev-api`). Validate proxies `/garbo-local` there. Unearth API on :3000 does not implement `/api/queue-archive`.

Alternatively, use `VITE_UNEARTH_TARGET=stage` for archive only (hybrid setup).

### `prisma://` URL errors (Unearth API)

```bash
cd API
npx prisma generate
npm run dev
```

### Redis connection errors

Ensure `docker compose up` started Redis and `REDIS_HOST=localhost` / `REDIS_PORT=6379` in API `.env`.

---

## Checklist: “I want Validate + restored prod DB”

- [ ] One `docker compose up` (Postgres + Redis)
- [ ] Backup restored into `garbo` database
- [ ] Garbo migrations applied if needed
- [ ] **Unearth API** running on :3000 (`API` repo)
- [ ] Optional: **Garbo HTTP API** on :3002 for queue archive / BullMQ dashboard
- [ ] `DATABASE_URL` points at the restored DB
- [ ] Unearth API: `ALLOW_ANONYMOUS_CLIENT_API=true`
- [ ] Validate: `npm run dev:local-db` (or `dev:local-full` if you need local archive)
- [ ] GitHub OAuth configured; logged in via Validate
- [ ] **Not** required: API keys in Validate (with anonymous flag), `seed:client-api`, pipeline-api, Garbo workers

---

## Authentication & API keys

Reference for stage/prod targets, the Errors tab, key seeding, and troubleshooting 401/403s. **Skip this section** for local DB browsing if `ALLOW_ANONYMOUS_CLIENT_API=true` is set (see intro).

Validate uses **two auth mechanisms** — not interchangeable:

| Mechanism | Header | Used for | Where configured |
|-----------|--------|----------|------------------|
| **Staff JWT** | `Authorization: Bearer <token>` | Company editor, registry, crawler mutations, queue archive (staff path) | GitHub OAuth via Unearth API |
| **Client API key** | `X-API-Key: garb_<lookup>.<secret>` | Overview, Errors tab, integration routes (`/internal-*`) | Validate Vite proxy (stage/prod paths only) |

### `ALLOW_ANONYMOUS_CLIENT_API` (Unearth API only)

Set in **`API/.env`**, not Validate:

```env
ALLOW_ANONYMOUS_CLIENT_API=true
```

| Effect | Detail |
|--------|--------|
| **Does** | Bypasses `X-API-Key` on **integration** routes |
| **Does not** | Replace staff JWT — still log in for the editor |
| **When** | Local dev with `VITE_UNEARTH_TARGET=local` |
| **Never** | Production |

`/unearth-local` does not inject `X-API-Key`. Without this flag, Overview and other `/unearth-local/api/internal-*` routes return **401**.

### Validate proxy: which paths inject `X-API-Key`

| Dev proxy path | Injects key? | Env var (Validate `.env.development`) |
|----------------|--------------|---------------------------------------|
| `/unearth-local` | **No** | — (use `ALLOW_ANONYMOUS_CLIENT_API` on API) |
| `/unearth-stage` | Yes | `GARBO_STAGE_ALL_ACCESS_API_KEY` |
| `/unearth` (prod) | Yes | `GARBO_PROD_ALL_ACCESS_API_KEY` |
| `/garbo-local/api/queue-archive` | **No** | — (Garbo on :3002; staff JWT or `ALLOW_ANONYMOUS` on Garbo API) |
| `/garbo-stage/api/queue-archive` | Yes | `GARBO_STAGE_ALL_ACCESS_API_KEY` |
| `/pipeline-local` | No | Pipeline uses JWT for writes, not API keys |

**Errors tab** always calls `/unearth-stage` and `/unearth` (prod), regardless of `VITE_UNEARTH_TARGET`. Needs both `GARBO_STAGE_ALL_ACCESS_API_KEY` and `GARBO_PROD_ALL_ACCESS_API_KEY` even when browsing a local DB.

### Validate `.env.development` API key vars

| Variable | Proxied routes (dev) |
|----------|----------------------|
| `GARBO_ALL_ACCESS_API_KEY` | Deployed `/unearth-api/` only (not Vite dev) |
| `GARBO_STAGE_ALL_ACCESS_API_KEY` | `/unearth-stage`, `/garbo-stage/api/queue-archive` |
| `GARBO_PROD_ALL_ACCESS_API_KEY` | `/unearth` (prod), Errors tab |

Values can be the same string if that key exists in both databases. `GARBO_PROXY_CLIENT_API_KEY` (older Garbo docs) is **not** read by current Validate `vite.config.ts`.

### Unearth API `.env` — seeding keys (not proxy)

Used by `npm run seed:client-api` to write keys into Postgres:

| Variable | Role seeded |
|----------|-------------|
| `GARBO_ALL_ACCESS_API_KEY` | `all-access` |
| `GARBO_BASE_API_KEY` | `integration` |

Requires `API_SECRET` in `.env`. For local integration routes, prefer `ALLOW_ANONYMOUS_CLIENT_API=true` over seeding — `/unearth-local` does not send keys anyway.

`GARBO_ALL_ACCESS_API_KEY` on the **Unearth API pod** (production) is for outbound server calls, not Validate’s browser proxy.

### API keys by scenario

| Scenario | Unearth API `.env` | Validate `.env.development` | Login |
|----------|-------------------|----------------------------|-------|
| **A — Local DB browse** | `ALLOW_ANONYMOUS_CLIENT_API=true` | `npm run dev:local-db` | GitHub OAuth |
| **B — Stage only** | (no local API) | `npm run dev:local` | GitHub OAuth |
| **Local DB + pipeline** | `ALLOW_ANONYMOUS_CLIENT_API=true` | `npm run dev:local-db-pipeline` | GitHub OAuth |
| **Full local** | anonymous on Unearth; keys on Garbo if archive anonymous off | `npm run dev:local-full` | GitHub OAuth |
| **Local without anonymous** | `seed:client-api`; anonymous `false` | Overview on `/unearth-local` won’t work — use anonymous or stage target | GitHub OAuth |

### Quick diagnosis

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 401 on company editor | Not logged in | GitHub OAuth login in Validate |
| 401 on Overview (local) | No key on `/unearth-local` | `ALLOW_ANONYMOUS_CLIENT_API=true` on Unearth API |
| 401 on Overview (stage) | Missing/wrong proxy key | `GARBO_STAGE_ALL_ACCESS_API_KEY` in Validate |
| 401 on Errors tab | Missing stage or prod key | Both `GARBO_STAGE_*` and `GARBO_PROD_*` in Validate |
| 403 on API route | Key valid, wrong role | Re-run `seed:client-api` with `GARBO_ALL_ACCESS_API_KEY` |
| 401 on pipeline upload/rerun | JWT mismatch | Match `JWT_SECRET` in Unearth API and pipeline-api; log in |

---

## Related docs

- [API and proxy setup](./API_AND_PROXY_SETUP.md) — Vite/nginx paths and API keys
- [API repo README](https://github.com/UnearthData/api) — Unearth API local development
- [Garbo README](https://github.com/Klimatbyran/garbo) — workers, containers, backup restore
- [Pipeline API README](https://github.com/Klimatbyran/pipeline-api) — live job API
- `API/doc/COMPANY_ID_MIGRATION.md` — shared DB schema migration notes
