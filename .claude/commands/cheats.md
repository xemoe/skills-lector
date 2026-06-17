---
description: Build your reusable prompt cheat sheet from Claude session history.
argument-hint: "[build|status]"
allowed-tools: Bash(node:*), Read, Write
disable-model-invocation: true
---

Build or refresh the prompt cheat sheet shown on the Skills Lector `/cheats` page.

Argument: **$ARGUMENTS** (default `build`).

- `build` (or empty): run the full pipeline from the `cheats` skill:
  1. `node .claude/skills/cheats/scripts/extract.mjs`
  2. Read `.cheats/raw.json`, analyze every prompt (add `improved`, `intent`,
     `tags`, `reuseScore`; cluster near-duplicates), and Write `.cheats/analyzed.json`
     using the schema in `.claude/skills/cheats/SKILL.md`.
  3. `node packages/presets/scripts/import-cheats.mjs .cheats/analyzed.json`
  Then report how many prompts were imported and tell the user to open `/cheats`.

- `status`: read `.cheats/raw.json` (if present) and report how many prompts were
  last extracted and when — use `raw.prompts.length` for the count and
  `raw.extractedAt` for the timestamp — without re-running anything.

Follow the method in `.claude/skills/cheats/SKILL.md` exactly.
