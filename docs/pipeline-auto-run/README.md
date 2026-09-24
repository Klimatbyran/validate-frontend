# Pipeline auto-run

Validate UI lives in this repo (`/upload?tab=autorun`). The orchestrator is in
**Klimatbyran/garbo** — see [PR #1425](https://github.com/Klimatbyran/garbo/pull/1425).

This agent cannot push to `Klimatbyran/garbo` (403). After rebasing onto
`main`, conflicts in `prisma/schema.prisma` and `src/startWorkers.ts` were
resolved locally. Apply and force-push from a machine with write access:

```bash
cd garbo
git fetch origin main
git checkout cursor/pipeline-auto-run-e5c5
git reset --hard origin/main
git am path/to/validate-frontend/docs/pipeline-auto-run/garbo-rebase.patch
# or: git apply --index … && git commit
git push --force-with-lease origin cursor/pipeline-auto-run-e5c5
```

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
