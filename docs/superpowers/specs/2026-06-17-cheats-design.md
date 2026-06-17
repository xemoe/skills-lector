# Cheats — Reusable Prompt Library · Design Spec

**Date:** 2026-06-17 · **Status:** Approved · **Rendered copy:** `docs/reports/2026-06-17-cheats-feature-design.html`

## 1. Summary

A **Cheats** feature that turns past Claude prompts into a searchable, reusable prompt library. A Claude Code command reads session history, analyzes it, and stores curated prompts in SQLite. A new `/cheats` web page browses, copies, and favorites them.

The split mirrors the existing `/discover` feature: heavy lifting (read history, analyze, improve) happens in a Claude Code command; the web app only reads. **The web app never calls an LLM or the network** — all analysis is pre-computed and stored.

## 2. Goals & constraints

**In scope**
- Extract user-typed prompts from **all projects** in `~/.claude/projects/**/*.jsonl`.
- Use Claude to **analyze + improve**: dedupe, tag, rate reusability, store a rewrite next to the original.
- `/cheats` page: search, filter, sort, copy to clipboard, detail page per cheat, favorite (pin).
- Persist in the existing `presets.db` via a new migration.

**Out of scope (YAGNI)**
- Live in-browser prompt improvement (impossible under no-LLM-in-web rule).
- Editing stored prompt text from the web. Authoring stays in Claude Code.
- A separate database or package.

**Hard constraints**

| Constraint | Consequence |
|---|---|
| No LLM/network in web | Web is read + one small write (favorite). All intelligence pre-computed. |
| exFAT volume | No symlinks. SQLite writes use temp-file + atomic rename (same as preset engine). |
| No npm workspaces | Reader imported via `@lector/presets/*` path alias. |
| presets = only mutating surface | Favorite write lives in `packages/presets`; `packages/core` stays pure-read. |

## 3. Architecture

Two halves joined only through the database file. Claude Code side produces; web side consumes. Neither imports the other.

```
~/.claude/projects/**/*.jsonl
            │
            ▼
[Claude Code generator]  ──writes──▶  [presets.db: cheats table]  ──reads──▶  [Web /cheats]
 skill + /cheats command                  (migration v2)            ◀─favorite─  (read-only + 1 write)
 extract → analyze → store
```

Proven `/discover` pattern, but the store is SQLite (queried, filtered, mutated by favorite) instead of a JSON manifest. The preset engine already provides the SQLite plumbing.

## 4. Data model

New table via forward-only migration `packages/presets/src/migrations/002_cheats.sql`. The runner picks it up on next open.

`cheats` columns:

| Column | Type | Purpose |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | surrogate key |
| prompt_hash | TEXT NOT NULL UNIQUE | hash of normalized original — dedupe/upsert key |
| original | TEXT NOT NULL | raw past prompt, verbatim |
| improved | TEXT | Claude rewrite, nullable |
| intent | TEXT | short category/intent label |
| tags | TEXT | JSON array string |
| reuse_score | INTEGER | reusability 0–100 |
| project | TEXT | origin project path |
| occurrences | INTEGER NOT NULL DEFAULT 1 | times seen |
| favorite | INTEGER NOT NULL DEFAULT 0 | web-writable pin |
| favorited_at | TEXT | ISO when pinned, nullable |
| first_seen_at | TEXT NOT NULL | ISO |
| last_seen_at | TEXT NOT NULL | ISO |
| created_at | TEXT NOT NULL | ISO |
| updated_at | TEXT NOT NULL | ISO |

Migration ends with `INSERT OR IGNORE INTO schema_version(version) VALUES (2);`.

**Critical invariant:** `store` upserts on `prompt_hash` and touches **analysis columns only** — never `favorite` / `favorited_at`. Re-running preserves pins.

**Decision:** `favorite` is a column (1:1 with cheat), not a separate `cheat_favorites` table — simpler than the preset engine's many-to-many `pinned_items`.

## 5. Generator pipeline

Skill `.claude/skills/cheats/` holds logic + scripts; thin `/cheats` slash command is the entrypoint. Scripts are standalone Node + `better-sqlite3`. Claude sits in the middle.

1. **Extract** — `extract.mjs` walks `~/.claude/projects/**/*.jsonl` (reuse `activity.ts` traversal), pulls user-typed prompts, strips tool results / system reminders / command stdout / hook context, normalizes + hashes, counts occurrences → `.cheats/raw.json`.
2. **Analyze** — Claude reads `raw.json`, produces per prompt: improved rewrite, intent, tags, reuse_score; clusters near-dupes → `.cheats/analyzed.json`.
3. **Store** — `store.mjs` leniently validates `analyzed.json`, upserts into `cheats`, preserves favorites. Atomic, partial-success (bad row skipped, not fatal).
4. **Refresh** — re-running converges on current history; favorites survive, analysis columns update.

Scripts do deterministic I/O; Claude does judgment. Free (runs in-session), no API key — unlike a script calling the Anthropic API directly.

## 6. Web layer & UI

**Reader & API** — `packages/presets/src/cheats.ts` exposes `listCheats()`, `getCheat(id)`, `setFavorite(id, on)`. Write stays in presets (core stays pure-read). Detail page calls `getCheat` directly in RSC.

| Route | Method | Does |
|---|---|---|
| `/api/cheats` | GET | all cheats for explorer live refresh |
| `/api/cheats/[id]/favorite` | POST | toggle favorite — the one mutating route |
| `/cheats` | RSC | force-dynamic page, prefetches list |
| `/cheats/[id]` | RSC | detail, reads one cheat directly |

**Page** — `components/cheats-explorer.tsx` mirrors `commands-explorer.tsx`: search; filter by project / tag / intent; sort by recency / reuse_score / occurrences; favorites-only toggle; pagination. Detail page shows original + improved side-by-side, each with copy button, plus tags, project, seen-range. `StatCards` header: total / favorites / projects / avg reuse score. Empty state → run `/cheats` in Claude Code (same as `/discover`).

**Files**

Create:
- `packages/presets/src/migrations/002_cheats.sql`
- `packages/presets/src/cheats.ts` (reader + favorite write)
- `.claude/skills/cheats/` — SKILL.md, `scripts/extract.mjs`, `scripts/store.mjs`
- `.claude/commands/cheats.md` (thin slash command)
- `apps/web/app/cheats/page.tsx`, `app/cheats/[id]/page.tsx`, `app/api/cheats/route.ts`, `app/api/cheats/[id]/favorite/route.ts`
- `apps/web/components/cheats-explorer.tsx`

Edit:
- `apps/web/components/main-nav.tsx` — add `{ href: "/cheats", key: "cheats" }`
- `apps/web/lib/i18n/dictionaries/en.ts` & `th.ts` — nav label + page strings

## 7. Edge cases & testing

**Edge cases**
- Empty DB → empty state, no crash.
- Huge history → `extract` caps at newest N transcripts (like `activity.ts` caps newest 2000 files).
- Malformed transcript line → skipped, not fatal.
- Bad analysis row → leniently validated, dropped if invalid.
- Re-run must not clobber a pin → upsert never writes favorite columns.

**Testing** — no web test suite; `npm run build` is the type check. Per-script self-checks:
- `extract` — normalization / hashing / dedupe (`demo()` self-check).
- `store` — upsert updates analysis columns and **preserves favorite** across re-run.
- `cheats.ts` — reader returns typed rows; `setFavorite` toggles.

## 8. Decisions locked

| Decision | Choice |
|---|---|
| Cheat content | Analyzed + improved (original kept alongside rewrite) |
| Storage | Reuse `presets.db`, new `cheats` table (migration v2) |
| Web actions | Browse/search/filter/sort, copy, detail page, favorite (DB write) |
| History scope | All projects; filter by project in UI |
| Analysis pipeline | A — script extract → Claude analyze → script store |
| reuse_score | Integer 0–100 |
| favorite | Column on `cheats` (not separate table) |
