# Flows page — design spec

Date: 2026-06-26
Status: approved

## Summary

A **Flow** is a named, ordered list of prompt-**cheats** for one kind of work
(e.g. "Ship a feature" = research → plan → implement → review). The Flows page
lets you create flows, auto-seed starter flows from existing cheats, reorder /
add / remove steps, and copy the chain as one combined prompt or step-by-step.

Persisted in SQLite (`~/.skills-lector/presets.db`) — `packages/presets` is the
only mutating package. Mirrors the existing **presets** feature shape (list +
detail pages, `/api` routes, query hooks) and the **cheats** JSON-column
convention.

## Decisions (locked)

- **Concept:** ordered cheat sequence. Steps reference cheats by id.
- **Persistence:** new SQLite table via migration `004_flows.sql`.
- **Authoring:** auto-seed (button) + manual edit.
- **Actions:** copy combined prompt, copy per-step, link each step to `/cheats/[id]`.
- **Route:** `/flows` (plural, matches `/cheats` `/presets`).
- **Reorder:** ↑/↓ buttons (no drag dependency).
- **Steps storage:** JSON id-array column (same convention as `cheats.tags`); **no FK to cheats** (a cheat re-import must not cascade-delete steps; a missing cheat degrades to a "removed" row at read time).

## Data layer — `packages/presets`

### `src/migrations/004_flows.sql`

```sql
-- v4 flows: ordered sequences of cheats ("workflows") for a kind of work.
-- Written + read by src/flows.ts (web-mutating, like presets).

CREATE TABLE IF NOT EXISTS flows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    description TEXT,
    steps       TEXT    NOT NULL DEFAULT '[]',  -- JSON array of cheat ids, ordered
    seeded      INTEGER NOT NULL DEFAULT 0,      -- 1 = auto-seeded starter
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flows_slug ON flows(slug);

INSERT OR IGNORE INTO schema_version(version) VALUES (4);
```

### `src/types.ts` (append)

```ts
export type Flow = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    steps: number[];        // ordered cheat ids
    seeded: boolean;
    createdAt: string;
    updatedAt: string;
};
```

### `src/flows.ts` (new — read + write)

Exact exported signatures (web + API depend on these — do not drift):

```ts
export function listFlows(): Flow[];                       // most-recently-updated first
export function getFlow(id: number): Flow | null;
export function getFlowBySlug(slug: string): Flow | null;

export class SlugCollisionError extends Error {}          // mirror presets.ts

export type CreateFlowInput = { slug: string; name: string; description?: string | null };
export function createFlow(input: CreateFlowInput): Flow; // throws SlugCollisionError

export type UpdateFlowInput = { name?: string; description?: string | null };
export function updateFlow(id: number, input: UpdateFlowInput): Flow;  // throws if id unknown

export function setFlowSteps(id: number, cheatIds: number[]): Flow;    // add/remove/reorder in one call
export function deleteFlow(id: number): void;

export type SeedResult = { created: Flow[] };
export function seedFlows(): SeedResult;                   // idempotent; see algorithm
```

- Row↔object mapping mirrors `cheats.ts` (`rowToFlow`, `parseSteps` JSON-safe like `parseTags`, `COLS` constant). `seeded` ↔ `0|1`. `steps` ↔ JSON.
- `createFlow`: `INSERT`; catch UNIQUE on `slug` → throw `SlugCollisionError`. `created_at = updated_at = new Date().toISOString()`.
- `updateFlow` / `setFlowSteps`: bump `updated_at`. `setFlowSteps` writes `JSON.stringify(cheatIds)`. Throw `Error` if id not found (like presets `updatePreset`).
- `deleteFlow`: `DELETE FROM flows WHERE id = ?`.

### `seedFlows()` algorithm

1. Read all cheats (`listCheats()` from `./cheats`).
2. Group by `intent` (skip cheats with null/empty intent).
3. Keep groups with **≥ 2** cheats.
4. For each group: slug = kebab of intent; if a flow with that slug already exists, **skip** (idempotent). Steps = that group's cheat ids ordered by `reuseScore` desc, then `occurrences` desc. name = the intent. `seeded = 1`.
5. Return `{ created }` (the flows actually inserted).

Kebab helper: lowercase, non-alphanumeric → `-`, collapse repeats, trim `-`. Fallback slug `flow` + dedupe suffix if intent kebabs to empty.

## API routes — `apps/web/app/api/flows` (mirror presets, zod-validated)

- `GET /api/flows` → `{ flows }`.
- `POST /api/flows` body `{ slug, name, description? }` → `{ flow }` 201; `409 slug_collision` on `SlugCollisionError`; `400 invalid_body`. Slug regex `^[a-z0-9][a-z0-9-]*$`, name 1..120, description ≤500 nullable.
- `POST /api/flows/seed` → `{ created }`.
- `GET /api/flows/[id]` → `{ flow }` or 404.
- `PATCH /api/flows/[id]` body `{ name?, description? }` → `{ flow }`; 404 if unknown.
- `DELETE /api/flows/[id]` → `{ ok: true }`; 404 if unknown.
- `PUT /api/flows/[id]/steps` body `{ cheatIds: number[] }` (ints ≥1) → `{ flow }`; 404 if unknown.

All `export const dynamic = "force-dynamic"`. Error envelope matches presets (`{ error, detail }` / `{ error, message }`).

## Client — `apps/web`

### `lib/flow-resolve.ts` (pure, client-safe, framework-agnostic)

```ts
import type { Cheat } from "@lector/presets/types";
import type { Flow } from "@lector/presets/types";

export type ResolvedStep = { cheatId: number; cheat: Cheat | null };  // null = removed cheat

export function resolveSteps(flow: Flow, cheatsById: Map<number, Cheat>): ResolvedStep[];

// Numbered combined prompt. Header per step: "## Step N — <intent or 'Step N'>".
// Body = improved ?? original. Skips removed cheats. Steps joined by "\n\n".
export function buildCombinedPrompt(flow: Flow, cheatsById: Map<number, Cheat>): string;

export function cheatsByIdMap(cheats: Cheat[]): Map<number, Cheat>;
```

Reuses `displayedPrompt`-style logic (improved-falls-back-to-original).

### Query layer — `components/flow/`

- `flow-query-keys.ts` — `flowsQk = { list: () => [...], detail: (id) => [...] }` (mirror `cheat-query-keys.ts`).
- `use-flow-queries.ts` — `useFlowsList`, `useFlow(id)`, `useCreateFlow`, `useUpdateFlow`, `useSetSteps`, `useDeleteFlow`, `useSeedFlows`. Optimistic patch for `useSetSteps` (reorder feels instant); invalidate on settle. Use `jsonFetch`.

### Components — `components/flow/`

- `flows-explorer.tsx` — card list of flows (name, description, step count, `seeded` badge), "New flow" → `/flows/new`, "Seed from cheats" button (calls `useSeedFlows`). Empty state.
- `flow-editor.tsx` — detail: header (name/description, inline edit via `useUpdateFlow`), ordered step rows, "Add step" (cheat-picker), **Copy combined prompt** button, delete-flow.
- `flow-step-row.tsx` — step N · cheat intent + truncated prompt preview · ↑/↓ (disabled at ends) · remove · copy-step · `Link` → `/cheats/[id]`. Reorder/remove call `useSetSteps` with the new id array.
- `cheat-picker.tsx` — search box over `useCheatsList`, click a cheat to append its id (skip ids already in steps). Reuse `filterSortCheats` or simple substring.
- Copy uses `navigator.clipboard.writeText`. Reuse existing copy affordance if one exists (`InlineCode` / any copy-button component); otherwise a small local button.

### Pages — `apps/web/app/flows`

- `flows/page.tsx` — `dynamic="force-dynamic"` server component. `listFlows()` + `listCheats()` → seed QueryClient (`flowsQk.list()` + `cheatsQk.list()`), `<HydrationBoundary>` → `<FlowsExplorer/>`. Title/subtitle from i18n. Empty state when no flows.
- `flows/new/page.tsx` — create form (clone `/presets/new`): name → auto-slug (kebab, editable), description. POST `/api/flows`, on 201 route to `/flows/[id]`; surface 409 slug collision.
- `flows/[id]/page.tsx` — server component: `getFlow(id)` (404 → `notFound()`), `listCheats()` → seed both queries → `<FlowEditor flowId=.../>`.

### Nav + i18n

- `components/main-nav.tsx`: add `{ href: "/flows", key: "flow", Icon: Workflow }` (lucide `Workflow`). Import it. Active check: `pathname.startsWith("/flows")` (the generic branch already covers this).
- `lib/i18n/dictionaries/en.ts` + `th.ts`: add `nav.flow` ("Flows" / "โฟลว์") and a `flowsPage` block (`title`, `subtitle`, empty-state strings, button labels) mirroring `cheatsPage`. Add to the `Dictionary` type if it is explicitly typed.

## Testing

Repo has no test framework ("`npm run build` is the type check"). Per the lazy
one-check rule, add **one** runnable node assert self-check for the only
non-trivial pure logic: `lib/flow-resolve.test.mjs` (or inline `demo()` guarded
by `import.meta`) asserting `resolveSteps` (incl. a removed cheat → `null`) and
`buildCombinedPrompt` (numbering, improved-fallback, removed-step skip). Runnable
with `node`. No framework.

`npm run build` must stay green (Turbopack type-check) — primary acceptance gate.

## File inventory

New:
```
packages/presets/src/migrations/004_flows.sql
packages/presets/src/flows.ts
apps/web/app/flows/page.tsx
apps/web/app/flows/new/page.tsx
apps/web/app/flows/[id]/page.tsx
apps/web/app/api/flows/route.ts
apps/web/app/api/flows/seed/route.ts
apps/web/app/api/flows/[id]/route.ts
apps/web/app/api/flows/[id]/steps/route.ts
apps/web/lib/flow-resolve.ts
apps/web/lib/flow-resolve.test.mjs
apps/web/components/flow/flow-query-keys.ts
apps/web/components/flow/use-flow-queries.ts
apps/web/components/flow/flows-explorer.tsx
apps/web/components/flow/flow-editor.tsx
apps/web/components/flow/flow-step-row.tsx
apps/web/components/flow/cheat-picker.tsx
```
Edit:
```
packages/presets/src/types.ts        (append Flow type)
apps/web/components/main-nav.tsx     (nav link)
apps/web/lib/i18n/dictionaries/en.ts (nav.flow + flowsPage)
apps/web/lib/i18n/dictionaries/th.ts (nav.flow + flowsPage)
```

## Out of scope (YAGNI)

No flow execution/running, no scheduling, no sharing/export files, no per-step
parameters/placeholders, no drag-and-drop, no flow-level tags/search. Add later
if pressure is real.
