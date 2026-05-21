---
description: Install a Claude Skill from the vendored repos under ./vendor. Run it without arguments to list what is available.
argument-hint: "[skill-name] [personal|project]"
allowed-tools: Bash(node:*)
disable-model-invocation: true
---

## Skills available under ./vendor

!`node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs list`

## Your task

Install a vendored Claude Skill for the user. Arguments given to this command: **$ARGUMENTS**

Interpret the arguments against the list above:

- **A skill name was given** — install it:
  `node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs install <name> --target <target>`
  - `<target>` defaults to `personal` (`~/.claude/skills/`, usable in every project). Use `project` (`.claude/skills/`, this repo only) when the arguments contain the word `project` or `--target project`.
  - If the requested name is not in the list above, do not guess — tell the user and show the available names.
  - If the script reports the skill already exists, ask the user before re-running with `--force` to overwrite.
- **No skill name was given** — show the available skills from the list above, ask which one to install and whether to install it for `personal` (everywhere) or `project` (this repo only), then install it.

When finished, confirm the installed skill name and where it landed. The user can verify it in the catalog with `npm run dev` then Rescan.

For adding a new skills repository as a submodule, or updating vendored repos, use the `install-vendor-skill` skill.
