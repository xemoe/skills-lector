---
name: cheats
description: Build a reusable prompt cheat sheet from this machine's Claude session history. Use when the user asks to analyze, mine, curate, or improve their past prompts, or to populate the Skills Lector /cheats page.
---

# Cheats — mine and curate reusable prompts

Turns the user's past Claude prompts into a curated, reusable library stored in
`presets.db`, surfaced by the Skills Lector `/cheats` web page. The pipeline is
three steps; you (Claude) are the middle step.

## Pipeline

1. **Extract** — run the dependency-free extractor:
   `node .claude/skills/cheats/scripts/extract.mjs`
   It writes `.cheats/raw.json` (repo root) with up to 500 deduped user prompts,
   each `{ hash, original, occurrences, firstSeenAt, lastSeenAt, project, provenance }`.
   It drops subagent task-prompts (`isSidechain`), hook/system-injected prompts
   (`promptSource:"system"`), command wrappers, and interrupt markers — only genuine
   user prompts survive. `provenance` is `"typed"` (harness-confirmed the user typed it)
   or `"legacy"` (older entry from before the harness stamped origin — kept, unprovable).

   **Only-new by default.** Extract reads `.cheats/known-hashes.json` (refreshed by
   the importer in step 3) and skips any prompt already in the library, so re-running
   only surfaces prompts you haven't curated yet — it never re-analyzes or overwrites
   existing entries. `raw.json` carries `mode`, `knownHashes`, and `skippedKnown` to
   show what was skipped. Pass **`--full`** to ignore the library and re-extract every
   prompt (use when you've improved the analysis pass and want to rebuild all). With no
   library file yet, only-new behaves as full automatically.

2. **Analyze** — Read `.cheats/raw.json` (a wrapper object; iterate its
   `prompts` array). For each prompt produce an analyzed entry. Preserve
   `hash`, `original`, `occurrences`, `firstSeenAt`,
   `lastSeenAt`, `project`, `provenance` unchanged, and ADD:
   - `improved` — a tightened, reusable rewrite of `original` (string).
   - `intent` — a short lower-case label, e.g. `debugging`, `refactor`,
     `code-review`, `planning`, `docs`.
   - `tags` — 1–4 short topic tags (string array).
   - `reuseScore` — 0–100 integer; higher = more broadly reusable. Penalize
     one-off or context-bound prompts; reward clear, transferable instructions.
   Cluster near-duplicates that survived hashing: keep the best phrasing, sum
   their `occurrences`, and set the cluster's `provenance` to `"typed"` if ANY
   member is typed (typed wins), else `"legacy"`. Write the result to
   `.cheats/analyzed.json` as `{ "schemaVersion": 2, "analyzedAt": "<ISO>",
   "cheats": [ ...entries ] }`.

3. **Store** — upsert cheat markdown files under `~/.skills-lector/store/cheats/` via the shared `cheats-store.mjs`:
   `node packages/presets/scripts/import-cheats.mjs .cheats/analyzed.json`
   The importer upserts on `hash` (filename = numeric id) and NEVER touches `favorite` — re-running is
   safe and preserves the user's pins. It prints `[cheats] imported N, skipped M → <store path>`.
   After importing it refreshes `.cheats/known-hashes.json` with every hash now in
   the library, which is what makes step 1's only-new mode work on the next run.

   Seeding an existing store (first time only): if the library predates only-new mode
   and `known-hashes.json` doesn't exist yet, run
   `node packages/presets/scripts/import-cheats.mjs known-hashes` once to dump the
   current hashes — otherwise the next extract runs full and re-analyzes everything.

Then tell the user to open the Skills Lector `/cheats` page (press Rescan or
reload) to browse the result.

## JSON contract

`raw.json` is a wrapper object whose `prompts` array holds the entries:
```json
{ "schemaVersion": 2, "extractedAt": "<ISO>", "projectsScanned": 5,
  "transcriptsRead": 42, "typedCount": 30, "legacyCount": 12, "errors": [],
  "prompts": [
    { "hash": "ab12…", "original": "Refactor the auth middleware…",
      "occurrences": 3, "firstSeenAt": "2026-05-01T10:00:00.000Z",
      "lastSeenAt": "2026-06-10T09:00:00.000Z", "project": "/Users/me/app",
      "provenance": "typed" }
  ] }
```

`analyzed.json` entry (extends the raw entry):
```json
{ "hash": "ab12…", "original": "Refactor the auth middleware…",
  "improved": "Refactor the auth middleware so the token-expiry check is correct…",
  "intent": "refactor", "tags": ["auth", "middleware"], "reuseScore": 78,
  "occurrences": 3, "firstSeenAt": "…", "lastSeenAt": "…", "project": "/Users/me/app",
  "provenance": "typed" }
```

`schemaVersion` is `2`; bump it in both scripts and the skill on any breaking change.

## Notes

- Heavy work (history read, analysis) is here, never in the web app — the web app
  makes no LLM or network calls. The split mirrors the `discover-popular-skills` skill.
- `.cheats/` is git-ignored (a local cache), including `known-hashes.json`.
- If `raw.json` has 0 prompts in **only-new** mode (`mode: "only-new"`), nothing new
  has been typed since the last run — tell the user the library is already up to date
  (suggest `--full` only if they want to rebuild). If it has 0 prompts in **full** mode,
  there is no session history to mine yet.
