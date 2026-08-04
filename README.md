# Skills Lector

A local dashboard for everything Claude Code has installed on your machine — **Skills**, slash **Commands**, and **Hooks** — plus **Cheats** (reusable prompts mined from your session history) and **Flows** (cheats chained into prompt pipelines).

Runs entirely on your machine. Nothing leaves your computer.

## Quick start

Requires Node.js 18.18+ and npm.

```bash
git clone https://github.com/xemoe/skills-lector.git
cd skills-lector
npm run install:all
npm run dev
```

Open **http://localhost:4317**.

Optional — pull external skill repos into `vendor/` (used by `/discover` and the vendor-install command):

```bash
git submodule update --init --recursive
```

## What you get

| Page | What it shows |
|---|---|
| `/` | Every Claude Skill on your machine — searchable, with source repo, freshness, and usage |
| `/commands` | Every slash command |
| `/hooks` | Every hook from your `settings.json` files |
| `/cheats` | Reusable prompts mined from your Claude session history |
| `/flows` | Cheats chained into ordered prompt pipelines, with skill-aware step enhancement |
| `/presets` | Named bundles that toggle which skills/commands Claude may auto-invoke |
| `/discover` | Popular Claude Skills repositories on GitHub, ranked |

Plus `/sources`, `/analytic`, `/graph`, and a `/usecase` onboarding guide. Bilingual UI (English/Thai), light/dark theme, Windows + macOS.

## Claude commands

This repo ships five slash commands. Run them inside Claude Code from the repo root.

### `/skill-lector:cheats`

Build the prompt cheat sheet shown on `/cheats` from your session history.

```text
/skill-lector:cheats            # full pipeline: extract → analyze → import
/skill-lector:cheats status     # show what was last extracted, without re-running
```

### `/skill-lector:discover-skills`

Search GitHub for popular Claude Skills repositories and vendor the ones you pick.

```text
/skill-lector:discover-skills                # search and rank the top 10
/skill-lector:discover-skills clone <name>   # add one under vendor/ as a git submodule
/skill-lector:discover-skills status         # show the current manifest
```

### `/skill-lector:vendor-install`

Install a skill from `vendor/` into your Claude setup (installs are copies, not symlinks).

```text
/skill-lector:vendor-install                      # list available vendored skills
/skill-lector:vendor-install <skill-name>         # install to ~/.claude/skills (all projects)
/skill-lector:vendor-install <skill-name> project # install to .claude/skills (this repo only)
```

### `/skill-lector:model-invocation`

Control whether Claude may invoke a skill/command on its own, or only you via `/`.

```text
/skill-lector:model-invocation               # list every skill and command with its setting
/skill-lector:model-invocation <name> off    # make it slash-only
/skill-lector:model-invocation <name> on     # let Claude invoke it automatically
/skill-lector:model-invocation all off       # bulk: everything slash-only (previews first)
```

### `/skill-lector:flow-enhance`

Rewrite each step of a Flow into a reusable template that folds in your installed skills. Needs the dev server running; find flow ids on `/flows`.

```text
/skill-lector:flow-enhance <flow-id>
```

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies for all three packages |
| `npm run dev` | Dev server on http://localhost:4317 |
| `npm run build` | Production build (also the TypeScript type-check) |
| `npm start` | Serve the production build on port 4317 |

Variants: `dev:autoport` / `start:autoport` pick the next free port; `dev:portless` / `start:portless` serve stable HTTPS URLs via [portless](https://github.com/vercel-labs/portless).

## Configuration

All optional.

- Copy `apps/web/skills-lector.config.example.json` to `apps/web/skills-lector.config.json` to add extra scan roots or override paths.
- Env vars: `SKILLS_SCAN_ROOTS` (extra scan dirs), `CLAUDE_CONFIG_DIR` (overrides `~/.claude`), `SKILLS_LECTOR_PRESETS_DB` (presets database path), `SKILLS_LECTOR_PERSONAL_ROOT` (where preset activations write).

## Project layout

- **`apps/web`** — the Next.js app (pages, `/api` routes, UI).
- **`packages/core`** — read-only scanning engine (skills, commands, hooks, discover manifest).
- **`packages/presets`** — the only mutating surface (presets database, cheats and flows stores).

Architecture details live in [CLAUDE.md](CLAUDE.md).

## Note: exFAT volumes

If the repo sits on an exFAT drive (no symlink support): build with Turbopack only (the npm scripts already do), use npm — not pnpm — and keep `apps/web/scripts/exfat-readlink-fix.cjs` in place. On other filesystems none of this matters. See [CLAUDE.md](CLAUDE.md).
