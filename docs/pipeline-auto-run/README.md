# Pipeline auto-run

Validate UI lives in this repo (`/upload?tab=autorun`). The orchestrator is in
**Klimatbyran/garbo** — see [PR #1425](https://github.com/Klimatbyran/garbo/pull/1425)
(rebased onto `main`, mergeable).

Deploy order: apply Garbo migration `20260924120000_pipeline_auto_run`, then
restart Garbo workers, then ship Validate.

## Stage verification checklist

- [ ] Migration applied; `GET /api/pipeline-auto-run` returns defaults (`enabled: false`)
- [ ] Validate `/upload?tab=autorun` loads status; filter dropdowns from Unearth
- [ ] Save filters + run options; toggle **On** with Docling up → one registry report enqueued (`autoRun: true`)
- [ ] Toggle **Off** while a job is queued → no new enqueues; in-flight job finishes
- [ ] Stop Docling → status shows paused (`docling_unreachable`); no new enqueues
- [ ] Force 3 Docling failures on auto-run jobs → soft disable (`docling_failures`)
- [ ] Report parks on company-name / company-link approval → concurrency slot frees; next report can Docling
- [ ] Approve in Jobbstatus → same thread continues without re-Docling
- [ ] `requireEmissionsPresence` on → non-emissions PDF becomes `skipped_no_emissions`
