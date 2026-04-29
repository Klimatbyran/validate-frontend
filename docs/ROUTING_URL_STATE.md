# URL State & Routing Rules

This app uses a **hybrid routing** approach: **path routes** for major navigation and identity, plus **query params** for view-state and filters. The goal is:

- Refresh keeps you on the same view
- Links are shareable for the views that matter
- URL logic stays consistent and maintainable

## What goes in the path vs query params

### Put it in the **path** when it answers “what page/resource is this?”

Use path segments for:

- **Top-level navigation** (major app areas)
  - Example: `/upload`, `/editor`, `/errors`
- **Resource identity** (something you’d fetch by ID)
  - Example: `/editor/company/:companyId`
- **Major mode changes** that fundamentally change what the screen _is_
  - Example: `/editor/multi-company` (if we choose to model this as a route)
- **States that must behave like pages in browser history**
  - If users expect back/forward to traverse it like page navigation, it should usually be a route.

**Rule of thumb**: If changing it would reasonably warrant a new breadcrumb label or page title, it’s probably a route.

### Put it in **query params** when it answers “how is the page currently configured?”

Use query params for:

- **Tabs/subtabs inside a page**
  - Example: `/editor/company/Q123?tab=emissions`
- **Filters and search**
  - Example: `?q=volvo&tags=auto,sweden&years=2023,2024`
- **Sorting and paging**
  - Example: `?sort=updatedAt:desc&page=2`
- **UI preferences / toggles** (open/closed panels, “show unverified”, etc.)
  - Example: `?filtersOpen=1&unverifiedOnly=1`

**Rule of thumb**: If it’s safe to drop and the page still “makes sense”, it’s usually a query param.

## Required behavior

- **Every route-level screen must be reconstructible from the URL.**
  - If the user refreshes, the app must land on the same top-level tab and (where applicable) the same selected resource.
- **Query params should be optional.**
  - If absent, the screen should choose sensible defaults (e.g. default tab).
- **Unknown/invalid values should fail safe.**
  - If `?tab=not-a-real-tab`, fall back to default (don’t crash).
- **Changing URL state must not break deep links.**
  - Prefer additive changes; if we must rename params, keep compatibility for at least one release.

## Naming conventions (query params)

Keep names short, explicit, and stable.

- **General**
  - `tab`: active tab/subtab within the current route
  - `q`: search query (only if context is obvious; otherwise use `search`)
  - `sort`: sort key and direction (e.g. `updatedAt:desc`)
  - `page`, `pageSize`: pagination
  - `filters`: filters enabled
- **Booleans**
  - Use `1`/`0` (preferred) or `true`/`false`, but be consistent per param.
  - Examples: `filtersOpen=1`, `unverifiedOnly=0`
- **Lists**
  - Use comma-separated values for short lists: `tags=a,b,c`, `years=2023,2024`
  - Values must be URL-safe; if not, encode each item.
- **Do not encode large blobs**
  - If it’s long enough to be annoying or exceed typical URL limits, it should not be in the URL. Store it elsewhere (server, local storage) and keep a stable key in the URL.

## Canonical examples we will follow

These examples are meant to be copied by humans and AI tools.

### Top-level tabs (route)

- `/upload`
- `/editor`
- `/errors`
- `/crawler`
- `/registry`
- `/jobbstatus`
- `/workflow`
- `/debug`

### Jobbstatus (Live vs Archive)

The route is **`/jobbstatus`** only. **Live** and **Archive** are in-page tabs (not separate path segments). Today they use default tab state in the UI and are **not** synced to the URL; a future improvement could add e.g. `?source=live|archive` per the query-param rules above if we want refresh/share to preserve the subtabs.
- `/climate-plans`

### Upload (query params)

- Upload mode is a view config → query param:
  - `/upload?mode=url`
  - `/upload?mode=file`

### Editor (route + query params)

- Editor as a top-level area → route:
  - `/editor`
- Selected company is a resource identity → route param:
  - `/editor/company/:companyId`
- Company detail subtab is a view config → query param:
  - `/editor/company/Q123?tab=company-detail`
  - `/editor/company/Q123?tab=emissions`
  - `/editor/company/Q123?tab=economy`
  - `/editor/company/Q123?tab=reporting-periods`

### Filters (query params)

Filters belong in query params when:

- They help a user return to the same list state after refresh
- They are reasonably short

Example:

- `/editor?q=volvo&tags=auto,sweden&years=2023,2024&unverifiedOnly=1`

## Decision checklist (quick)

Before adding any new URL state, answer:

1. **Is this identifying a resource?**
   - Yes → **path**
2. **Is this selecting a major area/mode that should feel like navigation?**
   - Yes → usually **path**
3. **Is this configuring a view (tab/filter/sort/toggle)?**
   - Yes → **query param**
4. **Will users expect back/forward to traverse it as a page?**
   - Yes → prefer **path** (or at minimum write history entries when changing it)
5. **Could it be large or sensitive?**
   - Yes → do **not** put it in URL (store it elsewhere)

## Implementation guidelines (React Router)

- Prefer using `useSearchParams()` for query params and keep components **controlled** by URL state.
- Prefer `useParams()` for route params like `:companyId`.
- When updating query params, use a helper so we don’t accidentally wipe unrelated params.
- Do not rely on `defaultValue` for tabs that should persist across refresh; bind `value` to URL-derived state.
