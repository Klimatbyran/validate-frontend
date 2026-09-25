# Pipeline auto-run

Validate UI: `/upload?tab=autorun` (`AutoRunPanel`).

Orchestrator: [Klimatbyran/garbo#1425](https://github.com/Klimatbyran/garbo/pull/1425)
(`GET|PATCH /api/pipeline-auto-run` + `pipelineAutoRun` worker).

## Deploy order

1. Apply Garbo migration `20260924120000_pipeline_auto_run` and deploy Garbo API + workers
   (include the candidate-selection fix on that PR).
2. Deploy Validate.
3. Leave auto-run **Off** until smoke-ready; set backlog filters before any On test.

## Stage verification checklist

- [ ] Migration applied; `GET /api/pipeline-auto-run` returns defaults (`enabled: false`)
- [ ] Validate `/upload?tab=autorun` loads status; filter dropdowns from Unearth
- [ ] Save filters + run options; toggle **On** with Docling up → one registry report enqueued (`autoRun: true`)
- [ ] After several `skipped_no_emissions`, later ticks still enqueue other reports (not stuck)
- [ ] Toggle **Off** while a job is queued → no new enqueues; in-flight job finishes
- [ ] Stop Docling → status shows paused (`docling_unreachable`); no new enqueues
- [ ] Force 3 Docling failures on auto-run jobs → soft disable (`docling_failures`)
- [ ] Report parks on company-name / company-link approval → concurrency slot frees; next report can Docling
- [ ] Approve in Jobbstatus → same thread continues without re-Docling
- [ ] `requireEmissionsPresence` on → non-emissions PDF becomes `skipped_no_emissions`
- [ ] Clear Jobbstatus batch on Auto-run and Save → `runOptions.batchId` is gone on next GET
