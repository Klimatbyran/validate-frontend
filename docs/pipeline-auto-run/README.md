# Pipeline auto-run (companion Garbo changes)

Validate UI for this feature is in this repo. The orchestrator lives in **Klimatbyran/garbo**.

This agent could not push to `Klimatbyran/garbo` (403). Apply the companion patch there:

```bash
cd garbo
git checkout -b cursor/pipeline-auto-run-e5c5
git apply ../validate-frontend/docs/pipeline-auto-run/garbo.patch
# or: git am < ../validate-frontend/docs/pipeline-auto-run/garbo.patch
npx prisma migrate deploy   # applies 20260924120000_pipeline_auto_run
```

## Stage verification checklist

- [ ] Migration applied; `GET /api/pipeline-auto-run` returns defaults (`enabled: false`)
- [ ] Validate `/upload?tab=autorun` loads status; filter dropdowns from Unearth
- [ ] Save filters + run options; toggle **On** with Docling up → one registry report enqueued (`autoRun: true`)
- [ ] Toggle **Off** while a job is queued → no new enqueues; in-flight job finishes
- [ ] Stop Docling → status shows paused (`docling_unreachable`); no new enqueues
- [ ] Force 3 Docling failures on auto-run jobs → soft disable (`docling_failures`)
- [ ] Report parks on company-name / company-link approval → concurrency slot frees; next report can Docling
- [ ] Approve in Jobbstatus → same thread continues without re-Docling
- [ ] `requireEmissionsPresence` on → non-emissions PDF becomes `skipped_no_emissions` (once garbo#1423 / pipeline-api#86 are deployed)
