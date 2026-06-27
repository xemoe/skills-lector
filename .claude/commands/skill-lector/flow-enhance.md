---
description: Enhance a Flow by rewriting each step to fold in the guidance of the user's most relevant installed Claude Skills, Plugins, and Commands, then save the result onto the flow's detail page. Pass the numeric flow id.
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

### 4. Rewrite each step

Rewrite each step's `body`, preserving the user's original instruction and
intent, but folding in the concrete technique from the matched skills/commands
(their workflow, checklists, guardrails). Keep it a usable prompt, not a summary
of the skill. Record, per step, the `cheatId`, the rewritten text, and the names
of what you folded in. **Only include a step you actually enhanced** — a step
with no relevant match is simply omitted (it renders un-enhanced on the page).

### 5. Save the result onto the flow (POST)

Build the payload as JSON — one entry per enhanced step, keyed by `cheatId` —
and `Write` it to `.flows/$ARGUMENTS-enhanced.json`:

```json
{
  "steps": [
    { "cheatId": 880, "enhanced": "<rewritten prompt>", "foldedIn": ["brainstorming", "planner"] },
    { "cheatId": 881, "enhanced": "<rewritten prompt>", "foldedIn": ["tdd-guide"] }
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
wrong — fix it (each step needs a numeric `cheatId` and a non-empty `enhanced`)
and retry. A `404 not_found` means the flow was deleted meanwhile.

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
