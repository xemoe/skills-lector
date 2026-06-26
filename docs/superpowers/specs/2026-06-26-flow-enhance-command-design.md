# Design — `/flow-enhance <flow-id>`

**Date:** 2026-06-26
**Status:** Approved, ready to implement

## Goal

A slash command that takes a Flow id and produces an **enhanced** version of
that flow's combined prompt: each step rewritten to fold in concrete guidance
from the user's installed Claude **Skills**, **Plugins**, and **Commands**.

## Background

A Flow (`packages/presets/src/types.ts` `Flow`) is an ordered list of Cheat
ids (`steps: number[]`). `apps/web/lib/flow-resolve.ts#buildCombinedPrompt`
already chains the steps into one markdown prompt
(`# <name>` + `## Step N — <intent>` + `improved ?? original`, skipping deleted
cheats, gap-free numbering).

"Enhance" = **skill-aware rewrite**: Claude reads each step plus the relevant
installed skill/command bodies and rewrites each step to bake in that skill's
technique, keeping the original instruction intent.

## Decisions (from brainstorming)

1. **Enhance mode:** skill-aware rewrite (not mechanical annotation, not a
   passive context bundle).
2. **Output:** write to a git-ignored `.flows/<id>-enhanced.md`, print path +
   per-step summary (matches `.cheats/`, `.discover/` conventions).
3. **Data source:** an **HTTP API endpoint**, not a DB-direct CLI script —
   chosen for future integration (a web "Enhance" button or any other client
   can reuse it). Server-side reuse of `scanSkills()` / `scanCommands()` gives
   plugin skills, descriptions, and file paths for free.

## Architecture

Three touches. No `packages/*` changes, no new script, no new dependency.

### 1. `apps/web/app/api/flows/[id]/enhance/route.ts` (new)

`GET /api/flows/:id/enhance` → bare JSON (matches the repo's existing route
style — `{ flow }`, `{ error: "not_found" }` + status — not a `{success,data}`
envelope).

```ts
const id = parseFlowId(idStr);               // inline, mirrors sibling routes
if (!id)   → { error: "invalid_id" } 400
const flow = getFlow(id);                    // @lector/presets/flows
if (!flow) → { error: "not_found" } 404

const byId = cheatsByIdMap(listCheats());    // @lector/presets/cheats + lib/flow-resolve
return {
  flow: { id, slug, name },
  combinedPrompt: buildCombinedPrompt(flow, byId),
  steps: <resolveSteps, skip deleted, gap-free> → [{ n, intent, body: improved ?? original }],
  skills:   scanSkills().skills.map(s => ({ name, description, path: s.skillMdPath, scope: s.type })),
  commands: scanCommands().commands.map(c => ({ name, description, path: c.path, scope: c.scope })),
};
```

`Cache-Control: no-store`. `export const dynamic = "force-dynamic"`.

The `combinedPrompt` is returned for convenience/debugging; the command works
from the structured `steps` + catalog.

### 2. `.claude/commands/flow-enhance.md` (new)

Frontmatter: `argument-hint: "[flow-id]"`,
`allowed-tools: Bash(curl:*), Read, Write`, `disable-model-invocation: true`
(slash-only, like the sibling data commands).

Body instructs Claude to:

1. Resolve base URL: `$SKILLS_LECTOR_URL` if set, else probe
   `http://localhost:4317` then `https://lector-dev.local` (portless), use the
   first that responds. `curl -s --fail "$BASE/api/flows/$ARGUMENTS/enhance"`.
   Non-200 / unreachable → surface the error and hint (start the dev server, or
   set `SKILLS_LECTOR_URL`). The probe has a known 2-URL ceiling; the env var is
   the upgrade path.
2. For each step, pick the most relevant skills/commands from the returned
   catalog (match `description` against the step's `intent` / `body`), and
   `Read` their `path` bodies.
3. Rewrite each step prompt: keep the user's original instruction intent, fold
   in the chosen skill's concrete technique. A step with no clearly relevant
   skill is kept as-is and noted.
4. Assemble `# <flow name> (enhanced)` plus the rewritten step blocks, each
   tagged `→ folded in: <skills/commands>`.
5. `Write` the result to `.flows/<id>-enhanced.md`; print the path and a
   per-step summary.

**Guardrail:** only reference skills/commands present in the API response — no
inventing.

### 3. `.gitignore`

Add `.flows/`.

## Trade-offs accepted

- **Server must be running.** The 2-URL probe + a clear hint cover the miss.
  This is the cost of the API-backed approach, taken deliberately for
  reusability.
- **`parseFlowId` duplicated** into the new route (2 lines). Matches how the
  sibling `[id]` routes already inline it; not worth a shared helper yet.

## Out of scope (YAGNI)

- Server-side LLM rewrite (the rewrite is the agent's job; the endpoint only
  serves context).
- Query params to filter skill scopes — client filters if it ever needs to.
- Persisting the enhanced prompt back into the DB.

## Verification

- `npm run build` (Turbopack) type-checks the new route.
- Manual: start dev server, `/flow-enhance <id>` on a seeded flow, confirm
  `.flows/<id>-enhanced.md` is written with rewritten steps and fold-in tags;
  confirm a bad id surfaces the 404 hint.

---

## Revision 1 (2026-06-26) — persist on the flow detail page, per-step

The original design wrote the enhanced prompt to `.flows/<id>-enhanced.md`. Per
user direction, the result must instead be **persisted and shown on the flow
detail page** (`/flows/[id]`), **per step** (each pipeline node shows its rewrite
+ folded-in badges) — not a file or console output.

**Storage.** Migration `005_flow_enhanced.sql` adds a nullable `enhanced TEXT`
column to `flows`, holding JSON `{ generatedAt, steps: [{ cheatId, enhanced,
foldedIn: [] }] }`. Keyed by `cheatId` (not position) so it survives step
reorder; a step whose cheat has no entry renders un-enhanced. `flows.ts` gains
`parseEnhanced` + `setFlowEnhanced(id, steps)` (stamps `generatedAt`
server-side); `Flow` gains `enhanced: FlowEnhancement | null`; types add
`FlowEnhancement` / `FlowEnhancedStep`.

**API.** Same route file gains `POST /api/flows/:id/enhance` (zod-validated
`{ steps: [{ cheatId, enhanced, foldedIn }] }` → `setFlowEnhanced`). The `GET`
now also returns each step's `cheatId` so the command can key its rewrites. The
existing `GET /api/flows/:id` already carries `enhanced` to the detail page — no
extra fetch.

**UI.** `FlowEditor` builds a `Map<cheatId, FlowEnhancedStep>` from
`flow.enhanced` and passes it to `FlowPipeline` → `FlowNode`. A node with an
entry shows the rewrite by default (left primary border + "Enhanced" badge),
folded-in skill chips, and a raw↔enhanced toggle; copy copies the shown text.
Three i18n keys added (en + th): `enhanced`, `original`, `foldedIn`.

**Command.** Step 5 changes from "write a markdown file" to: build
`{ steps: [{ cheatId, enhanced, foldedIn }] }` (only steps actually enhanced) and
`POST` it; step 6 points the user to `/flows/<id>` to view it.

**Verified end-to-end:** `tsc --noEmit` clean; migration applied on restart;
POST→200; `GET /api/flows/28` carries the enhancement; `/flows/28` renders 8
Enhanced badges + folded-in chips aligned to the right steps; bad/oversized
bodies and unknown ids rejected with 400/404.

---

## Revision 2 (2026-06-26) — per-step variable fill drawer

Enhanced prompts carry `<placeholder>` variables (`<server1>`,
`<component/feature>`, …). Per user request, **each pipeline item** whose
enhanced prompt contains variables gets a **Fill variables** button that opens a
side drawer scoped to that one step: an input per distinct variable, a live
preview with values substituted (blank inputs keep their `<placeholder>`), and a
copy of the filled prompt. Ephemeral, client-only — no persistence, no backend
(variables come from the already-loaded enhanced text).

- `lib/flow-variables.ts` — pure `extractVariables` / `fillVariables` /
  `unfilledCount`. Variable = `<name>` (no nesting, 1–60 chars); fill uses
  split/join so regex-special names like `<component/feature>` are safe.
- `components/flow/flow-variable-drawer.tsx` — the shadcn `Sheet`
  (`side="right"`) drawer: inputs + live preview + copy/reset.
- `flow-node.tsx` — `Braces` button shown only when the enhanced step has ≥1
  variable; opens the drawer for that step.
- 6 i18n keys (en + th): `fillVariables`, `fillHint`, `preview`, `unfilled(n)`,
  `copyFilled`, `reset`.

**Verified:** `tsc --noEmit` clean; `/flows/28` shows exactly 5 Fill-variables
buttons (steps 1/3/4/5/8 — the ones with `<vars>`; 2/6/7 have none);
extract/fill asserts pass (distinct order, slash names, repeats, partial fill).
