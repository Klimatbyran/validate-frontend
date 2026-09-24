# Pipeline auto-run

Validate UI lives in this repo (`/upload?tab=autorun`). The orchestrator is in
**Klimatbyran/garbo** — see [PR #1425](https://github.com/Klimatbyran/garbo/pull/1425).

## Garbo follow-up (candidate selection)

This agent cannot push to `Klimatbyran/garbo` (403). Before enabling auto-run
on stage, apply the candidate-starvation fix on the PR branch:

```bash
cd garbo
git checkout cursor/pipeline-auto-run-e5c5
git am path/to/validate-frontend/docs/pipeline-auto-run/garbo-candidate-fix.patch
git push origin cursor/pipeline-auto-run-e5c5
```

That patch pages past skipped/failed claims, excludes `hasEmissionsMentions=false`
when the emissions gate is on, ages out stale `running` claims, and fails closed
on Redis queue-read errors.

Deploy order: apply Garbo migration `20260924120000_pipeline_auto_run`, then
restart Garbo workers, then ship Validate. Leave auto-run **Off** until the
candidate-fix commit is on the deployed Garbo image.

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
