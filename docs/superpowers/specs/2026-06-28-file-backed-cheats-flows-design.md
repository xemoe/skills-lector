# File-backed Cheats + Flows — Design

**Date:** 2026-06-28
**Status:** Approved
**Affects:** `packages/presets` (storage layer + importer), one-time migration script. No web UI, API route, page, component, or i18n changes.

## Goal

Move **Cheats** (Prompts) and **Flows** out of the shared SQLite database (`~/.skills-lector/presets.db`) into human-readable files under `~/.skills-lector/store/`. Cheats become markdown-with-frontmatter; flows become JSON. Both stores must be **writable offline from a plain `.mjs` script** (no running dev server) so Claude Code commands can generate new prompts and flows — the cheat importer already works this way; flows become symmetric.

Presets, pins, and the apply log stay in `presets.db` untouched. This effort moves storage only; the actual session-history → flow miner command is a deferred follow-up (the design just guarantees the writer path exists).

## Why files, why this format

- All 845 cheats carry an `improved` rewrite, but it is short (≤421 chars); `original` is the large field (up to ~21 KB, multi-line). So the body/frontmatter split is dictated by the data: the big multi-line blob (`original`) is the markdown body; the short `improved` plus every scalar is frontmatter.
- The cheat importer (`import-cheats.mjs`) is a plain `.mjs` run via `node` with no TypeScript transpilation, so it cannot import the TS modules. The file format (parse + serialize) is therefore shared between the TS reader and the `.mjs` writer through **one plain-JS module per feature**. A single source of the format is a data-integrity requirement, not a convenience: if writer and reader drift, files silently corrupt.

## Non-goals

- No change to presets/pins/apply_log storage.
- No change to any exported function signature in `cheats.ts` / `flows.ts`; API routes, pages, components, and i18n are untouched.
- No flow step-schema change: flows keep referencing cheats by **numeric `id`** (`steps: number[]`, enhancement keyed by `cheatId`).
- No history-mining flow-generator command in this effort (deferred).
- No caching, no file locking, no generic "file repository" abstraction (see Deliberate simplifications).

## On-disk layout

```
~/.skills-lector/
  presets.db                 # presets / pins / apply_log only (unchanged)
  store/
    cheats/<id>.md           # filename = numeric id (the key flows reference)
    flows/<slug>.json        # filename = slug (unique, immutable post-create)
```

Store root resolves to `~/.skills-lector/store`, overridable via a new `SKILLS_LECTOR_STORE` env var (used by selftests to target a tmp dir). It is independent of `SKILLS_LECTOR_PRESETS_DB`.

### Cheat file — `cheats/<id>.md`

Frontmatter holds every scalar field plus the short `improved`; the body is `original`, verbatim.

```markdown
---
promptHash: a1b2c3d4e5f60718    # identity / upsert key (sha256/16 of normalized original)
intent: debugging
tags: [bug, repro]
reuseScore: 90
project: /path/to/project
occurrences: 5
provenance: typed               # "typed" | "legacy"
improved: "kindly do X"         # short; js-yaml emits a block scalar if multi-line; null if absent
favorite: false
favoritedAt: null
firstSeenAt: 2026-01-02T03:04:05.000Z
lastSeenAt: 2026-02-10T09:00:00.000Z
createdAt: 2026-01-02T03:04:05.000Z
updatedAt: 2026-02-10T09:00:00.000Z
---
<original prompt text, verbatim, may be multi-KB and multi-line>
```

- `id` is taken from the filename (not stored in frontmatter — single source of truth, avoids divergence).
- `tags` is a YAML list. Missing/blank scalars (`intent`, `reuseScore`, `project`, `improved`, `favoritedAt`) round-trip as `null`.
- Parse is lenient: a file whose frontmatter fails to parse is collected into an `errors` list and skipped, never crashing a list read (mirrors the core scanners' degrade-don't-crash contract).

### Flow file — `flows/<slug>.json`

The full `Flow` object serialized as pretty-printed JSON, e.g.:

```json
{
  "id": 22,
  "slug": "feature",
  "name": "feature",
  "description": null,
  "steps": [101, 87, 9],
  "seeded": true,
  "enhanced": { "generatedAt": "2026-06-26T...", "steps": [ { "cheatId": 101, "enhanced": "...", "foldedIn": [] } ] },
  "createdAt": "2026-06-26T...",
  "updatedAt": "2026-06-26T..."
}
```

- `id` is preserved inside the file for URL stability (`/flows/[id]`); the filename is the slug.
- Slug is immutable: `UpdateFlowInput` carries only `name`/`description`, so a flow's file never needs renaming.

## Modules

### New — `packages/presets/src/cheats-store.mjs` (plain JS, JSDoc-typed)

Single source of the cheat file format and IO. Imported by both `cheats.ts` (allowJs) and `import-cheats.mjs`.

- `cheatsDir()` → resolved `store/cheats` path (honors `SKILLS_LECTOR_STORE`).
- `parseCheatFile(path)` → cheat object (id from filename, frontmatter via `js-yaml`, body = `original`).
- `serializeCheat(cheat)` → markdown text (frontmatter + body).
- `listCheatFiles()` → `{ cheats, errors }` (parse-tolerant).
- `readCheat(id)` → cheat object or `null`.
- `writeCheatAtomic(cheat)` → temp file in same dir + `renameSync` (exFAT-safe, mirrors `frontmatter.ts`).
- `nextCheatId()` → `max(existing ids) + 1` (0 → 1 on empty dir).
- `upsertByHash(input)` → find by `promptHash`; if found, update analysis fields while **preserving** `id`, `favorite`, `favoritedAt`, `createdAt`, and never downgrading `typed`→`legacy`; else allocate `nextCheatId`. **Returns the resulting cheat (with id)** so a flow generator can resolve mined prompts → step ids.

### New — `packages/presets/src/flows-store.mjs` (plain JS, JSDoc-typed)

Mirror of the cheat store for flow JSON. Imported by `flows.ts`; available to any future `.mjs` flow generator.

- `flowsDir()`, `parseFlowFile(path)`, `writeFlowAtomic(flow)`, `listFlowFiles()` → `{ flows, errors }`, `readFlowBySlug(slug)`, `readFlowById(id)` (scan + match), `nextFlowId()`, `deleteFlowFile(slug)`.

### Rewritten — `cheats.ts` (thin typed wrapper, same exports)

- `listCheats()` → `listCheatFiles().cheats`, sorted favorites-first then `lastSeenAt` desc.
- `getCheat(id)` → `readCheat(id)`.
- `setFavorite(id, on)` → read, patch `favorite`/`favoritedAt`, atomic write, return updated; `null` if id unknown.

Types are applied at this boundary (the `.mjs` returns plain objects; the wrapper annotates `Cheat` / `Cheat[]`).

### Rewritten — `flows.ts` (thin typed wrapper, same exports)

`listFlows`, `getFlow`, `getFlowBySlug`, `createFlow` (`SlugCollisionError` if `<slug>.json` exists), `updateFlow`, `setFlowSteps`, `setFlowEnhanced`, `deleteFlow`, `seedFlows` — all re-expressed over `flows-store.mjs`. `seedFlows` keeps its current algorithm (group cheats by `intent`, ≥2 per group, top-8 by reuseScore then occurrences, idempotent skip when `<slug>.json` exists).

### Rewritten — `scripts/import-cheats.mjs`

- Remove `better-sqlite3`, `openDb`, `runMigrations`, and DB path resolution.
- `importCheats(rows)` → for each analyzed row: validate, `keyOf(original)` (recompute — ignore any caller-supplied hash), `upsertByHash(...)` via `cheats-store`. Same `{ imported, skipped }` return.
- `writeKnownHashes()` → read every cheat file's `promptHash`.
- `known-hashes` subcommand and `selftest` retargeted to files (selftest writes to a tmp `SKILLS_LECTOR_STORE`).
- Invariants preserved end to end: favorite/favoritedAt never written by the importer; `typed` never downgraded; caller-supplied hash ignored.

### Changed — `db.ts` + migrations

- Delete `migrations/002_cheats.sql`, `003_cheats_provenance.sql`, `004_flows.sql`, `005_flow_enhanced.sql` (they only create the now-removed tables). Keep `001_initial.sql` (presets/pins/apply_log).
- `db.ts` is otherwise unchanged and continues to serve presets. Deleting already-applied migrations is safe: the runner only compares the migration list against the `schema_version` high-water mark — existing DBs at v5 skip everything; fresh DBs apply only `001`.
- `schema.sql` (the legacy root snapshot) is updated to drop the cheats/flows DDL, or annotated as presets-only, to avoid documenting tables that no longer exist.

### New — `scripts/migrate-to-files.mjs` (one-time)

1. Open `presets.db`.
2. Read all `cheats` rows → write `cheats/<id>.md` (ids preserved).
3. Read all `flows` rows → write `flows/<slug>.json` (ids preserved, `steps`/`enhanced` parsed from their JSON columns).
4. Verify: file count == row count for each; abort before any destructive step on mismatch.
5. Backup: copy `presets.db` → `presets.db.bak-<timestamp>`.
6. `DROP TABLE cheats;` `DROP TABLE flows;` (then optional `VACUUM`).
7. Print a summary.

Safety: refuses to run if `store/cheats` or `store/flows` already contains files, unless `--force` (prevents clobbering hand-edited files on a re-run). If the tables are already absent, it is a no-op.

## Data-integrity invariants (must hold after migration)

- Every existing flow's `steps` still resolve: cheat ids are preserved 1:1 from the DB.
- Cheat identity remains `promptHash`; the importer upserts by hash, never by id.
- `favorite` / `favoritedAt` are owned by the web (`setFavorite`) and never overwritten by the importer.
- `provenance` only ratchets `legacy` → `typed`, never back.

## Deliberate simplifications (ponytail)

- **No caching.** `listCheats` reads ~845 files + parses YAML per request (~tens of ms on localhost). Add the core scanners' 8s in-process cache only if measured slow.
- **No file locking.** Single-user localhost dashboard. `nextCheatId`/`nextFlowId` use `max+1`; comment names the ceiling (concurrent writers could collide) and the upgrade path.
- **No drop-migration.** The one-time script performs the drop; fresh installs simply never create the tables.
- **Two concrete stores, not a generic repository.** Only the cheat *format* is shared (between its reader and writer); no speculative abstraction over both features.

## Testing

- `cheats-store`: serialize → parse round-trip equality; `upsertByHash` preserves `favorite`/`favoritedAt`/`id`/`createdAt`; `provenance` no-downgrade; caller-supplied hash ignored. (Port the current `import-cheats.mjs` selftest to the file store.)
- `flows-store` / `flows.ts`: `createFlow` → `getFlow`/`getFlowBySlug` → `setFlowSteps` → `setFlowEnhanced` → `deleteFlow` round-trip; `SlugCollisionError` on duplicate; `seedFlows` idempotent. (Mirrors `apps/web/lib/flow-resolve.test.mjs`, runnable via `node --experimental-strip-types` or as `.mjs`.)
- `migrate-to-files.mjs`: self-verifies row→file counts before dropping; manual run is the integration check against the real DB.
- Final gate: `npm run build` (type-correctness) with the dev server stopped (build shares `apps/web/.next` and 500s a live server).

## Rollout

1. Implement stores + wrappers + importer + db/migrations changes.
2. Run `migrate-to-files.mjs` against the live `~/.skills-lector/presets.db` (845 cheats, 15 flows).
3. Verify the Cheats and Flows pages render identically; spot-check a flow with `enhanced` data (slugs `feature`, `chore`, `config`).
4. `npm run build`, then restart `dev:portless`.

## Risks

- **Destructive migration** (drops two tables). Mitigated by the `.bak` copy and the count-verify gate that aborts before any drop. Files are the sole source of truth afterward.
- **Format drift** between `.mjs` writer and TS reader. Mitigated by sharing the single `cheats-store.mjs` and round-trip tests.
- **Read latency** at larger cheat counts. Acceptable now; cache is a known, isolated upgrade.
