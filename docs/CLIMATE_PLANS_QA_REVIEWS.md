# Climate plans QA reviews

Overlay-first human QA on climate-plans-pipeline step outputs. Reviews do **not** mutate live `Commitment` / measure / TE fields. They exist to improve the pipeline (evals, prompts) and can optionally be applied to live data in a later phase.

## Data (`PipelineReview`)

Stored in climate-plans-pipeline Postgres:

| Field | Purpose |
| --- | --- |
| `step`, `entityType`, `entityId` | What was judged |
| `reviewedSnapshot` | Pipeline output at review time (survives reruns) |
| `status` | `OK` \| `ISSUE` \| `SUGGESTED_FIX` |
| `comment` | Free-text note |
| `suggestedValue` | Preferred output JSON when suggesting a fix |

## API

- `GET /api/reviews?status=&step=&planId=` — board / export feed
- `GET /api/plans/:id/reviews`
- `POST /api/plans/:id/reviews` — upsert by `(plan, step, entityType, entityId)`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

`GET /api/plans/:id` includes `reviews`.

## Validate UI

1. **Climate Pipeline** step dialog — check / comment / pencil per entity (commitment, group, theme, measure, activity shift, municipality).
2. **QA reviews** tab — filterable board + JSON export. Deep links open the matching step dialog (`?planId=&step=`).

## Workflow

1. Reviewers mark issues and suggestions on real runs.
2. Export from the QA reviews board.
3. Use exports offline for evals / prompt iteration.
4. **Phase 2 (not built):** Apply / Dismiss with warn-on-drift (compare live entity to `reviewedSnapshot`, confirm before applying). Additive schema: `applyStatus`, `appliedAt`, `appliedBy`.

## Migrate locally

In `climate-plans-pipeline`:

```bash
npm run migrate
```
