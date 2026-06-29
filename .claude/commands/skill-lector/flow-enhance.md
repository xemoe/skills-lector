---
description: Enhance a Flow by rewriting each step into a GENERAL, reusable pipeline template at three lengths (short/long/precise) — specifics abstracted into <placeholder> variables — folding in the method of the user's most relevant installed Claude Skills, Plugins, and Commands, then save the result onto the flow's detail page. Pass the numeric flow id.
argument-hint: "[flow-id]"
allowed-tools: Bash(curl:*), Bash(node:*), Bash(mkdir:*), Bash(grep:*), Read, Write
disable-model-invocation: true
---

# Flow Enhance

Take the Flow whose id is **$ARGUMENTS**, rewrite each step to fold in concrete
guidance from the user's installed Claude Skills, Plugins, and Commands, then
**POST the per-step rewrites back so they show on the flow's detail page**
(`/flows/$ARGUMENTS`). The result is not a file or chat output — it is persisted
on the flow.

This command reads and writes through the running Skills Lector dev server's API,
so that server must be up (`npm run dev` / `npm run dev:portless`).

## Steps

### 1. Validate the argument

`$ARGUMENTS` must be a single positive integer (the flow id). If it is empty or
not a number, stop and tell the user the usage: `/skill-lector:flow-enhance <flow-id>`,
and that they can find ids on the `/flows` page.

### 2. Fetch the enhancement context (to a file — it is large)

The response includes the full installed-skill/command catalog (often 1000+
entries, ~500KB). **Do not pipe it into the conversation.** Save it to a file
and work from that file with targeted reads/greps.

Resolve the base URL (first that responds): `$SKILLS_LECTOR_URL` if set, else
`http://localhost:4317`, else `https://lector-dev.local` (portless). Save the
response:

```bash
mkdir -p .flows
BASE="${SKILLS_LECTOR_URL:-http://localhost:4317}"
curl -s --fail -o ".flows/$ARGUMENTS-context.json" "$BASE/api/flows/$ARGUMENTS/enhance" \
  || curl -s --fail -o ".flows/$ARGUMENTS-context.json" "https://lector-dev.local/api/flows/$ARGUMENTS/enhance"
```

Then inspect just the small parts (flow + steps) — never cat the whole file:

```bash
node -e 'const j=require("./.flows/"+process.argv[1]+"-context.json");console.log(j.flow.name+" — "+j.steps.length+" steps");for(const s of j.steps)console.log(`#${s.n} cheat:${s.cheatId} [${s.intent||""}] ${s.body.slice(0,100)}`)' "$ARGUMENTS"
```

Note each step's **`cheatId`** — you need it to key the rewrite when you POST it
back in step 5.

Handle failures:

- File contains `{"error":"invalid_id"}` — id malformed; repeat the usage.
- File contains `{"error":"not_found"}` — no such flow; point to `/flows`.
- Both curls fail (no file / empty) — dev server not running. Tell the user to
  start it (`npm run dev:portless`) or set `SKILLS_LECTOR_URL`, then re-run.
- `steps` empty — the flow has no usable steps (all cheats removed); stop.

The saved JSON shape:

```json
{
  "flow": { "id": 42, "slug": "ship-a-feature", "name": "Ship a feature" },
  "combinedPrompt": "# Ship a feature\n\n## Step 1 — ...",
  "steps": [ { "n": 1, "cheatId": 880, "intent": "plan", "body": "<prompt text>" } ],
  "skills":   [ { "name": "tdd-guide", "description": "...", "path": "/abs/SKILL.md", "scope": "personal|project|plugin|local" } ],
  "commands": [ { "name": "commit", "description": "...", "path": "/abs/commit.md", "scope": "personal|project|plugin" } ]
}
```

### 3. Match relevant skills/commands to each step

The catalog is too large to read whole. **Narrow first, then read.** Build a
one-line-per-item index, then grep it per step with keywords drawn from that
step's `intent`/`body`:

```bash
node -e 'const j=require("./.flows/"+process.argv[1]+"-context.json");for(const k of["skills","commands"])for(const it of j[k])console.log(`${k[0]}\t${it.name}\t${it.scope}\t${(it.description||"").replace(/\s+/g," ").slice(0,200)}\t${it.path}`)' "$ARGUMENTS" > ".flows/$ARGUMENTS-catalog.tsv"

grep -iE "plan|design|architect|spec" ".flows/$ARGUMENTS-catalog.tsv" | head -40
```

For each step: grep a few relevant keywords, pick the best 1-3 candidates from
the matches, then `Read` each chosen item's `path` (column 5 — the `SKILL.md` or
command `.md`) for its actual guidance. **Only choose items that appear in the
catalog — never invent one.** A step with no good match gets none; that is fine.

### 4. Rewrite each step into THREE length variants — GENERALIZE, don't bake in specifics

A flow is a **reusable pipeline template** the user re-runs for *any* task of
that kind — not a record of one past task. The seeded step `body` is a **specific
example** of a class of work. Your rewrite must lift it to the general case so
the same step is useful for every instance.

For each step, first name the **class of work** the example represents (e.g.
"adding a loading state to a long-running async op", "authoring a Claude skill",
"closing a GitHub issue via the gh CLI"). Then write it at **three lengths** — a
"length ladder". The three variants are the **same** generalized, parameterized
directive at increasing depth; they share the **same `<placeholder>` variables**
and the **same folded-in skills** — only the detail grows:

- **`short`** — a 1-2 line terse directive. Name the class of work and the
  parameterized action, nothing else. No heading, no bullets. ~140 characters.
  This is what the pipeline cards show, so it must stand alone. e.g.
  `Plan <feature>: list user-facing behaviour, risks, and phases before coding.`
- **`long`** — the method, structured for reading. ~800 characters, exactly:
  1. One `##` heading naming the class of work.
  2. 1-2 sentences: the generalized, parameterized directive.
  3. One `Folds in: <name>` line naming the matched catalog item(s).
  4. 2-5 short method bullets (a single-line command may be a bullet).
  5. A closing one-line *why it matters*.
- **`precise`** — the exact, rigorous spec. ~1000 characters, exactly:
  1. One `##` heading naming the class of work.
  2. A short **Inputs:** line listing the `<placeholder>` variables to fill.
  3. Numbered, exact steps — concrete actions, no hand-waving.
  4. An explicit **Guardrails:** list of constraints/checks that must hold.

These rules apply to **all three** variants:

- **Parameterize the specifics into `<placeholder>` variables.** Replace the
  one-off nouns — the thing being built, its target, its trigger, the repo/file —
  with `<placeholder>`s a person fills in the "fill variables" drawer (e.g.
  `<async-operation>`, `<skill-name>`, `<target-dir>`, `<issue-number>`). Keep any
  placeholders already present in the original `body` verbatim, and use the **same
  set** of placeholders across short/long/precise.
- **Fold the matched skill/command in as method** — the essential steps/guardrails
  — **not a full checklist, not a code skeleton, not a finished copy-paste
  solution.**
- **No project-specific code.** Do not reference this repo's files, components,
  hooks, or import paths (no real component names, no `@/components/...`). Tool /
  pattern level only (e.g. "use the gh CLI").

Record, per step, the `cheatId`, the three `variants`, and the names of what you
folded in. **Only include a step you actually enhanced** — a step with no
relevant match is simply omitted (it renders un-enhanced on the page).

> Anti-pattern (rejected): a multi-section implementation guide for one concrete
> realization — a literal React component named for this repo, a hard-coded bash
> script, project-only paths, exhaustive checklists. That serves a single task,
> not the reusable pipeline. Generalize.

**Format each variant as Markdown.** The flow detail page renders the variants as
Markdown (raw + rendered preview, stacked in the step drawer), so structure them
for reading — bullet/numbered lists for steps and checks, fenced code blocks for
commands, tight paragraphs. (The terse `short` variant is the exception: keep it
to plain text, no heading.)

Leave the `<placeholder>` variables exactly as `<name>` (literal angle
brackets) — **do not** wrap them in backticks or code spans yourself. The drawer
already chips them for display and uses them to drive the "fill variables"
inputs, so anything other than a bare `<name>` breaks that. Markdown is encouraged
*around* the placeholders, not on them.

**Placeholder hygiene (critical).** The page extracts *every* `<...>` as a
fill-in variable via the regex `/<([^<>]{1,60})>/g`, so anything in angle
brackets that isn't a real variable becomes a garbage chip:

- A placeholder is only a simple lowercase kebab-case noun — `<[a-z][a-z0-9-]*>`
  (e.g. `<async-operation>`, `<issue-number>`, `<skill-name>`). Nothing else
  belongs inside angle brackets.
- Never put spaces, `|`, `/`, `=`, quotes, parens, or code inside `<...>`. Write
  enum/option examples as plain text *outside* brackets — `model: haiku | sonnet
  | opus`, not `<haiku|sonnet|opus>`.
- Never write JSX/HTML/XML tags in fenced code (`<div>`, `</div>`, `<Suspense>`,
  `<MyComponent>`) — they pollute the variable list. Describe component structure
  in prose/checklist or use angle-bracket-free pseudocode; if you can't avoid
  tags, drop the code block and use a checklist instead.

### 5. Save the result onto the flow (POST)

Build the payload as JSON — one entry per enhanced step, keyed by `cheatId` —
and `Write` it to `.flows/$ARGUMENTS-enhanced.json`:

Each step carries a `variants` object with all three lengths; every value is a
non-empty Markdown string (newlines as `\n`):

```json
{
  "steps": [
    {
      "cheatId": 880,
      "variants": {
        "short": "Plan <feature>: list user-facing behaviour, risks, and phases before coding.",
        "long": "## Plan the feature\n\nBrainstorm before coding, then write the plan for <feature>.\n\nFolds in: brainstorming, planner\n\n- List the user-facing behaviour.\n- Note risks and dependencies.\n- Break the work into phases.\n\nWhy: a shared plan catches scope and risk before any code is written.",
        "precise": "## Plan the feature\n\nInputs: <feature>\n\n1. Enumerate every user-facing behaviour of <feature>.\n2. List dependencies and the risks each one carries.\n3. Split the work into ordered phases with a checkpoint per phase.\n\nGuardrails:\n- No code until the plan is written.\n- Each phase is independently shippable."
      },
      "foldedIn": ["brainstorming", "planner"]
    },
    {
      "cheatId": 881,
      "variants": {
        "short": "Implement <feature> test-first: red, green, refactor.",
        "long": "## Implement with TDD\n\nBuild <feature> test-first.\n\nFolds in: tdd-guide\n\n- Write a failing test for the next behaviour.\n- Make it pass with the minimal change.\n- Refactor, keep tests green.\n\nWhy: tests written first pin the behaviour and catch regressions for free.",
        "precise": "## Implement with TDD\n\nInputs: <feature>\n\n1. Write one failing test for the next behaviour of <feature> (red).\n2. Make it pass with the minimal change (green).\n3. Refactor while keeping every test green.\n4. Repeat until <feature> is complete.\n\nGuardrails:\n- Never write implementation before a failing test.\n- Keep the suite green at every step."
      },
      "foldedIn": ["tdd-guide"]
    }
  ]
}
```

Then POST it to the same endpoint (reuse the base URL that worked in step 2):

```bash
BASE="${SKILLS_LECTOR_URL:-http://localhost:4317}"
curl -s --fail -X POST -H "Content-Type: application/json" \
  --data @".flows/$ARGUMENTS-enhanced.json" "$BASE/api/flows/$ARGUMENTS/enhance" \
  || curl -s --fail -X POST -H "Content-Type: application/json" \
       --data @".flows/$ARGUMENTS-enhanced.json" "https://lector-dev.local/api/flows/$ARGUMENTS/enhance"
```

A success returns `{"flow":{…}}`. A `400 invalid_body` means the payload shape is
wrong — fix it (each step needs a numeric `cheatId` and a `variants` object whose
`short`, `long`, and `precise` are all non-empty strings) and retry. A
`404 not_found` means the flow was deleted meanwhile.

### 6. Report

Confirm where the result landed and summarise per step:

```
Enhanced flow 42 → saved to its detail page: /flows/42

Flow: Ship a feature (3 steps)
  Step 1 plan      → folded in: brainstorming, planner
  Step 2 implement → folded in: tdd-guide
  Step 3 review    → (no match — left as-is)
```

Tell the user to open or refresh **`/flows/$ARGUMENTS`** to see the enhanced
steps with their folded-in badges.
