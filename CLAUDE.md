# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project

Skills Lector — a local Next.js dashboard that scans the machine for everything Claude Code has deployed — **Skills** (`SKILL.md`), slash **Commands**, **Hooks**, and prompt **Cheats** mined from session history — showing what's installed, when it changed, and where it came from (GitHub repo or local dir). It also **manages** state: **Presets** toggle which skills/commands Claude may auto-invoke, and **Flows** chain Cheats into ordered prompt pipelines per kind of work.

Monorepo = one app + two packages:

- **`apps/web`** — the Next.js app (UI, pages, `/api` routes, app-local helpers). Consumes the packages via TS path aliases `@lector/core/*` and `@lector/presets/*`.
- **`packages/core`** — pure **read** engine: filesystem scanners, parsers, git/source resolution, shared types.
- **`packages/presets`** — the **only mutating** surface: SQLite-backed presets, pins, and the Cheats store; writes skill frontmatter.

## Monorepo layout

```
package.json            Root orchestrator — delegates dev/build/start/lint to apps/web
tsconfig.base.json      Shared compiler options (all packages extend it)
apps/web/
  app/                  App Router pages + /api routes
  components/           shadcn/ui primitives + app components (scanner/, presets/, cheats/, flow/)
  lib/                  Client-safe helpers: utils, i18n, theme, analytics, relations, cheats-filter, flow-{filter,resolve,step-diff,variables}, preset-query, item-key, json-fetch
  sample-skills/        Bundled examples (dashboard is never empty)
  scripts/              exfat-readlink-fix.cjs (the exFAT build shim)
packages/core/src/      scanner, command-scanner, hook-scanner, discover, parsers, frontmatter, pipeline, git, usage, cache, activity, marketplace, types
packages/presets/src/   presets, pinned, cheats, flows, activate, diff, enrich, events, frontmatter, identity, log, membership, db, types, util, schema.sql, migrations/
.claude/                This repo's own skills + slash commands
vendor/                 External skills repos as git submodules
```

**No npm workspaces** (they need symlinks/junctions exFAT can't store) — packages are wired by TS path aliases, and `apps/web/next.config.mjs` sets `turbopack.root` to the repo root so Turbopack resolves the siblings. Each package keeps its own `node_modules`.

## Commands

Run from the repo root (the root `package.json` delegates each script into `apps/web`):

```bash
npm run install:all   # install deps for packages/core, packages/presets, and apps/web
npm run dev           # dev server (Turbopack) — http://localhost:4317
npm run dev:autoport  # dev server on the next free port (no fixed -p)
npm run dev:portless  # dev server behind portless — https://lector-dev.local
npm run build         # production build (Turbopack); also runs the TypeScript type-check
npm start             # serve the production build on :4317
npm run start:autoport  # production server on the next free port
npm run start:portless  # production server behind portless — https://lector-prod.local
```

After a fresh clone, run `npm run install:all` — a plain root `npm install` only covers the orchestrator, which has no dependencies.

No test runner configured. `npm run build` is the type-correctness check; `npm run dev` is the feedback loop. (`npm run lint` exists but ESLint is not configured.) One self-contained assert test covers the flow-resolve helpers: `node --experimental-strip-types apps/web/lib/flow-resolve.test.mjs` (Node 22+).

### Portless (HTTPS local URLs)

`dev:portless` / `start:portless` wrap the autoport variants with [portless](https://github.com/vercel-labs/portless) for stable HTTPS URLs without a fixed port. Distinct app names (`lector-dev`, `lector-prod`) keep dev and prod from colliding. The proxy must already be running (`portless proxy start`) and the CA trusted once (`portless trust`). On this machine portless runs in **LAN mode**, so URLs use the **`.local`** TLD (reachable from other devices on the WiFi) — not `.localhost`. Don't disable LAN mode. **`dev:portless` is the normal way the dev server runs here** — restart with it, not plain `dev`.

## Critical: exFAT build constraint

This project sits on an exFAT volume. exFAT cannot store symlinks, and on it `fs.readlink` throws `EISDIR` instead of POSIX `EINVAL`, crashing standard Node tooling (`EISDIR: illegal operation ... readlink`). Consequences:

- **Build with Turbopack only** (`next build --turbopack`). The webpack builder crashes; the npm scripts already pass `--turbopack`.
- **Do not remove `apps/web/scripts/exfat-readlink-fix.cjs`** — it shims `fs.readlink` (`EISDIR`→`EINVAL`), loaded via `NODE_OPTIONS=--require` in every `apps/web` npm script.
- **Use npm, not pnpm**; **no npm workspaces** — both rely on symlinks/renames that fail on exFAT.

Moving to an NTFS drive would make all of the above unnecessary.

## Architecture

`packages/core` = read, `packages/presets` = read+write, `apps/web` = thin UI. Everything in `packages/*/src` is server-only (`fs` / `child_process` / SQLite) — never import it from a client component. `apps/web/lib/` is the client-safe layer.

### Readers — `packages/core`

Four readers, each cached in-process for 8s (`{ force: true }` bypasses) and returning a typed `*Result` from `types.ts`. Parse failures degrade into each result's `errors` list instead of crashing.

- **`scanSkills()`** (`scanner.ts`) — walks every `SKILL.md` under personal `~/.claude/skills`, plugins, Agent/Cowork sessions, project `.claude/skills`, bundled `sample-skills/`, and configured roots; lenient frontmatter parse (`skill-parser.ts`); classifies `personal | plugin | project | local`; resolves source via git remotes (`git.ts`); attaches usage from `~/.claude.json` (`usage.ts`); dedupes by logical identity.
- **`scanCommands()`** (`command-scanner.ts`) — every `.md` under personal/plugin/project `commands/`; subdirectories become a `:` namespace.
- **`scanHooks()`** (`hook-scanner.ts`) — the `hooks` key of personal/plugin/project `settings.json` + `settings.local.json` (the `local` scope); flattens `{ event → matcher → command }` into one record each.
- **`readDiscoverManifest()`** (`discover.ts`) — reads `.discover/results.json` (written by the discover skill, not the server) and annotates each entry vendored / not.

Scan roots + OS-specific locations live in `claude-paths.ts` / `config.ts`.

### Presets, Cheats + Flows — `packages/presets`

The mutating package. SQLite at `~/.skills-lector/presets.db` (override via `SKILLS_LECTOR_PRESETS_DB` env or `dbPath` in config; file + parent auto-created). Forward-only, idempotent migrations in `migrations/`.

- **Presets** — `applyPreset()` scans personal-scope items, diffs with the pure `computeApplyDiff()`, then atomically writes each item's `disable-model-invocation` frontmatter (temp file + rename, exFAT-safe). Partial-success: per-file errors are logged and status set to `partial`; there's no global fs+DB transaction, so the next apply re-converges from the filesystem. Pinned items always stay enabled. Logged in `apply_log*`; `active_preset` is a singleton row. (Same frontmatter field as the `set-model-invocation` skill, but bulk/runtime vs per-item/authoring.)
- **Cheats** — `cheats.ts` is the read side + the single `setFavorite` mutation; the bulk writer is `scripts/import-cheats.mjs`, run by the `cheats` skill / `/skill-lector:cheats` command (it mines reusable prompts from session history). Schema in migrations `002_cheats.sql`, `003_cheats_provenance.sql`.
- **Flows** — `flows.ts` is read+write (this package is the only mutating surface): a flow is an ordered JSON array of cheat ids (`steps`) modelling a per-work pipeline. CRUD via `createFlow`/`updateFlow`/`setFlowSteps`/`deleteFlow`; `seedFlows()` auto-generates starters by grouping cheats on `intent` (idempotent — skips existing slugs, caps at 8 steps); `setFlowEnhanced()` persists the per-step skill-aware rewrite (`enhanced` JSON, keyed by `cheatId` so it survives reorder). Schema in migrations `004_flows.sql`, `005_flow_enhanced.sql`. Served by `/api/flows/*`; `GET /api/flows/[id]/enhance` assembles the flow's combined prompt plus the installed skills/commands catalog for the `/skill-lector:flow-enhance` command to rewrite each step and POST back. No junction table — step→cheat integrity is app-level only.

### Web UI — `apps/web`

Pages are `dynamic = "force-dynamic"` Server Components: they call the readers / SQLite directly, seed a per-request TanStack `QueryClient` (`setQueryData` + `<HydrationBoundary>`), and render client explorers — **no client fetch on first paint**. Client components then subscribe via `components/{scanner,presets,cheats}/use-*-queries.ts`; the matching `/api/*` routes back the `?force=1` Rescan and mutations (favorite, preset apply, pins), which optimistically patch the cache then invalidate.

Catalogs (list + `/[id]` detail): **Skills** `/` & `/skills/[id]`, **Commands** `/commands`, **Hooks** `/hooks`, **Cheats** `/cheats`, **Flows** `/flows` (+ `/flows/[id]`, `/flows/new`). Other pages: **Presets** `/presets` (+ `/presets/new`, `/presets/[id]`, `/presets/log`), **Discover** `/discover`, plus `/analytic`, `/graph`, `/sources`, `/usecase`. Explorer filter/sort/page state lives in the **URL** — the Cheats and Flows explorers each share a pure filter module (`lib/cheats-filter.ts`, `lib/flow-filter.ts`) between their list and the detail page's prev/next/back nav (and the Flows detail's flow-switcher dropdown) so all surfaces walk the identical filtered list.

### Cross-platform

Targets Windows + macOS — always `os.homedir()` and `path`, never hardcoded separators. `claude-paths.ts` centralizes OS-specific locations (the Agent/Cowork dir differs across AppData / Application Support / `.config`).

## Configuration

- `skills-lector.config.json` (git-ignored; template `skills-lector.config.example.json`) or `SKILLS_SCAN_ROOTS` add extra scan roots. Read from cwd = `apps/web/` under the npm scripts, so place it there.
- `CLAUDE_CONFIG_DIR` overrides `~/.claude`; `SKILLS_LECTOR_PERSONAL_ROOT` overrides the preset apply target.

## Vendored skills

External skills are **git submodules under `vendor/`** — run `git submodule update --init --recursive` after cloning. The `install-vendor-skill` skill (and `/skill-lector:vendor-install` command) list/install them into `~/.claude/skills` or `.claude/skills`; installing **copies** the directory (exFAT has no symlinks). Helper: `node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs <list|install|installed>`.

## Discover popular skills

Two halves joined only by `.discover/results.json` (git-ignored cache) — the web app makes **no** GitHub calls. The `discover-popular-skills` skill (`/skill-lector:discover-skills`, helper `scripts/discover.mjs`) queries GitHub for popular Claude-Skills repos, writes the ranked top 10, and on confirmation runs `git submodule add`. The `/discover` page just reads the manifest.

## Styling

Tailwind CSS v4, no config file — the theme lives entirely in `apps/web/app/globals.css` (OKLCH tokens in `:root`/`.dark`, mapped via `@theme inline`, `@plugin "@tailwindcss/typography"`, `@custom-variant dark`). shadcn/ui (`components/ui/`) consume the tokens; `tw-animate-css` handles animation; the header has a light/dark toggle. **Use semantic tokens (e.g. `border-border`), not hardcoded palette values like `border-gray-200`, so dark mode stays correct.**
