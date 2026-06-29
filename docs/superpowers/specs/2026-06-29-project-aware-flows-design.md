# Project-aware Flows — Design

**Date:** 2026-06-29
**Status:** Approved (design), pending implementation plan

## Problem

Flows chain Cheats into ordered prompt pipelines, but have no notion of which
**project** (repo) their cheats came from. Cheats already carry a `project`
field (the raw `cwd` absolute path captured from transcript JSONL), and the
`/cheats` explorer already filters on it. Flows ignore it entirely:

- `seedFlows()` groups cheats by `intent` across **all** projects, mixing repos
  into one flow.
- The `/flows` explorer toolbar offers only free-text search + 3-way sort.
- The cheat picker (add-step dialog) lists every cheat regardless of repo.

Goal: thread the existing cheat `project` value through Flows so a user can
seed, build, and filter flows scoped to one repo — without inventing a new
project identity scheme or changing the `Flow` data model.

## Core principle

**A cheat's `project` (raw cwd string) is the only project key.** Flows never
store a project — it is always **derived** from the projects of the cheats a
flow's steps reference. This keeps the `Flow` type, the flows-store JSON, and
the presets DB untouched, and means a flow's project set is always correct as
steps are added/removed.

A flow matches a project P if **any** step cheat has `project === P` (the
"any step" rule). A mixed-repo flow therefore appears under every repo it
touches.

## Components

### A. Shared project-label helper — `apps/web/lib/project-label.ts` (new)

Client-safe, no server imports. Single source of truth for how a project
renders, so cheats + flows look identical.

```ts
projectBasename(path: string): string          // last path segment, for display
distinctProjects(cheats: Cheat[]): ProjectOption[]   // sorted, deduped
// ProjectOption = { value: string /* full cwd path */, label: string /* basename */ }
```

`value` is always the full cwd path (matches the existing `/cheats` exact-match
filter). `label` is the basename. Display surfaces show `label` with the full
path as a `title` tooltip.

Where practical, refactor the existing `/cheats` explorer's project-dropdown
construction to use `distinctProjects` (DRY) — only if it is a clean drop-in;
do not restructure the cheats page beyond that.

### B. Flows-list filter — `apps/web/lib/flow-filter.ts`

- `FlowFilters` gains `project: string` (default `"all"`).
- `parseFlowFilters` reads `?project=`; `buildFlowQuery` emits it, omitting the
  default `"all"`.
- `filterSortFlows(flows, filters, cheatProjectById)` — **new third argument**
  `cheatProjectById: Map<number, string | null>` (cheat id → its project).
  When `filters.project !== "all"`, keep a flow only if any step id maps to that
  project. Sort behaviour unchanged.
- New pure helper `flowProjects(flow, cheatProjectById): Set<string>` returns
  the distinct non-null projects across a flow's steps (used by both the filter
  predicate and the card badge).

Both `FlowsExplorer` and `FlowDetailNav` already hold the cheats list in the
React Query cache; both build the `Map` and pass it, so the list and the
detail-page prev/next walk the identical filtered set.

### C. Flows explorer toolbar — `apps/web/components/flow/flows-explorer.tsx`

- New project `<Select>` beside search + sort. Options: `"All projects"` plus
  `distinctProjects` restricted to projects that appear in at least one flow's
  steps (keeps the dropdown relevant). Bound to the `project` URL param.
- Seed control becomes a dropdown: `"All projects"` (current global
  intent-only seeding, unchanged) + one entry per project (scoped seed, see E).
- Each flow card shows derived project basename badge(s) via `flowProjects`
  (capped, e.g. first 2 + "+N"), so the filter reads legibly.

### D. Seed scoping — `packages/presets/src/flows.ts`

- `seedFlows(opts?: { project?: string }): SeedResult`.
- With `opts.project`: filter cheats to `c.project === opts.project` **before**
  the existing group-by-intent logic. Per intent group:
  - `slug = kebab(`${basename(project)}-${intent}`)`
  - `name = `${basename(project)} · ${intent}``
  - everything else (min 2 cheats per group, sort by reuseScore desc then
    occurrences desc, cap `MAX_SEEDED_STEPS = 8`, `seeded: true`) unchanged.
- Without `opts.project`: behaviour byte-for-byte unchanged.
- Idempotent: the existing "skip if slug file already exists" path covers
  re-runs and basename collisions.
- `// ponytail: slug uses basename — two repos sharing basename+intent collide
  and the 2nd is skipped. Add a short path hash to the slug if that ever bites.`

Uses `path.basename` server-side (separate concern from the client label
helper; no shared module needed across the package boundary).

### E. Seed API — `apps/web/app/api/flows/seed/route.ts`

- `POST` accepts optional Zod-validated body `{ project?: string }`, forwarded
  to `seedFlows`. Empty/absent body → global seed (unchanged).
- `useSeedFlows` (in `use-flow-queries.ts`) gains an optional `project` argument.

### F. Cheat-picker filter — `apps/web/components/flow/cheat-picker.tsx`

- Project `<Select>` beside the search input. Filters candidates by exact
  `c.project` match. Options: `"all"` + `distinctProjects` of **all** cheats
  (not just those already in flows). Default `"all"`. Composes with the existing
  search + already-added-id exclusion + 50-result cap.

## Data flow

```
transcript cwd ──(extract.mjs, unchanged)──▶ Cheat.project (raw path)
                                                   │
            distinctProjects() ◀──────────────────┤
                 │                                 │
   toolbar / picker / cheats dropdowns      cheatProjectById Map
                 │                                 │
        ?project= URL param ──▶ filterSortFlows(..., map) ──▶ visible flows
                                                   │
                          flowProjects(flow, map) ──▶ card badges
```

Seeding is the only write path touched, and only additively:
`seedFlows({project})` → new project-scoped flow files; global `seedFlows()`
output is unchanged.

## Error handling

- `distinctProjects` skips cheats with `project == null`.
- Seed body validation: malformed `project` (non-string) → 400 via Zod.
- Scoped seed with a project that has < 2 cheats in any intent group → no flows
  created (same as the existing too-small-group skip); API returns
  `{ created: [] }`.
- Slug collision on scoped seed → skipped (idempotent), not an error.

## Testing

Assert-based, run via `node --experimental-strip-types`, matching the existing
`apps/web/lib/flow-resolve.test.mjs` convention.

1. `apps/web/lib/flow-filter.test.mjs`
   - `flowProjects` returns the distinct project set for a mixed-step flow.
   - any-step predicate: a `[api, api, web]` flow matches both `/api` and `/web`,
     and is excluded by an unrelated project.
   - `parseFlowFilters` / `buildFlowQuery` round-trip including `project`, with
     `"all"` omitted from the query string.
2. `packages/presets/.../flows` seed self-check (temp `SKILLS_LECTOR_STORE`)
   - `seedFlows({ project })` only groups that repo's cheats; slug + name carry
     the basename; a second run is a no-op (idempotent skip).

## Out of scope (YAGNI)

- Storing a project on the `Flow` type / JSON.
- Reconciling the three existing project notions (`ProjectInfo.name`,
  `Cheat.project`, `SkillSource.repoRoot`) — Flows use only `Cheat.project`.
- Renaming/migrating existing seeded flows.
- A dedicated project landing page.

## Untouched

`Flow` type, flows-store JSON shape, presets SQLite, the cheats
extract/analyze/import pipeline, `set-model-invocation`, presets apply.
