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
   each `{ hash, original, occurrences, firstSeenAt, lastSeenAt, project }`.

2. **Analyze** — Read `.cheats/raw.json` (a wrapper object; iterate its
   `prompts` array). For each prompt produce an analyzed entry. Preserve
   `hash`, `original`, `occurrences`, `firstSeenAt`,
   `lastSeenAt`, `project` unchanged, and ADD:
   - `improved` — a tightened, reusable rewrite of `original` (string).
   - `intent` — a short lower-case label, e.g. `debugging`, `refactor`,
     `code-review`, `planning`, `docs`.
   - `tags` — 1–4 short topic tags (string array).
   - `reuseScore` — 0–100 integer; higher = more broadly reusable. Penalize
     one-off or context-bound prompts; reward clear, transferable instructions.
   Cluster near-duplicates that survived hashing: keep the best phrasing, sum
   their `occurrences`, and drop the rest. Write the result to
   `.cheats/analyzed.json` as `{ "schemaVersion": 1, "analyzedAt": "<ISO>",
   "cheats": [ ...entries ] }`.

3. **Store** — upsert into the database:
   `node packages/presets/scripts/import-cheats.mjs .cheats/analyzed.json`
   The importer upserts on `hash` and NEVER touches `favorite` — re-running is
   safe and preserves the user's pins. It prints `[cheats] imported N, skipped M → <db path>`.

Then tell the user to open the Skills Lector `/cheats` page (press Rescan or
reload) to browse the result.

## JSON contract

`raw.json` is a wrapper object whose `prompts` array holds the entries:
```json
{ "schemaVersion": 1, "extractedAt": "<ISO>", "projectsScanned": 5,
  "transcriptsRead": 42, "errors": [],
  "prompts": [
    { "hash": "ab12…", "original": "Refactor the auth middleware…",
      "occurrences": 3, "firstSeenAt": "2026-05-01T10:00:00.000Z",
      "lastSeenAt": "2026-06-10T09:00:00.000Z", "project": "/Users/me/app" }
  ] }
```

`analyzed.json` entry (extends the raw entry):
```json
{ "hash": "ab12…", "original": "Refactor the auth middleware…",
  "improved": "Refactor the auth middleware so the token-expiry check is correct…",
  "intent": "refactor", "tags": ["auth", "middleware"], "reuseScore": 78,
  "occurrences": 3, "firstSeenAt": "…", "lastSeenAt": "…", "project": "/Users/me/app" }
```

`schemaVersion` is `1`; bump it in both scripts and the skill on any breaking change.

## Notes

- Heavy work (history read, analysis) is here, never in the web app — the web app
  makes no LLM or network calls. The split mirrors the `discover-popular-skills` skill.
- `.cheats/` is git-ignored (a local cache).
- If `raw.json` has 0 prompts, tell the user there is no session history to mine yet.
