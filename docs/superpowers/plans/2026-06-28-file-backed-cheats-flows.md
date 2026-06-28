# File-backed Cheats + Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Cheats (markdown) and Flows (JSON) out of `presets.db` into files under `~/.skills-lector/store/`, keeping every exported function signature identical so the web app is untouched, and making both stores writable offline from `.mjs` scripts.

**Architecture:** Two plain-JS store modules (`cheats-store.mjs`, `flows-store.mjs`) own the on-disk format and IO; `cheats.ts`/`flows.ts` become thin typed wrappers over them. The cheat importer drops SQLite and writes `.md` files via the shared store. A one-time migration script copies existing rows to files (preserving ids), backs up the DB, and drops the two tables. Presets/pins/apply_log stay in SQLite.

**Tech Stack:** Node 22+, `better-sqlite3` (migration + presets only), `js-yaml` (cheat frontmatter), TypeScript path aliases (no build step for packages), `node --experimental-strip-types` for TS-importing tests.

**Spec:** `docs/superpowers/specs/2026-06-28-file-backed-cheats-flows-design.md`

---

## File structure

| File | Responsibility |
|------|----------------|
| `packages/presets/src/cheats-store.mjs` | **New.** Cheat `<id>.md` format + IO + hash-keyed upsert. Shared by `cheats.ts` and `import-cheats.mjs`. |
| `packages/presets/src/cheats-store.test.mjs` | **New.** Round-trip + upsert-invariant tests (pure `.mjs`). |
| `packages/presets/src/cheats.ts` | **Rewrite.** Thin typed wrapper (same exports: `listCheats`, `getCheat`, `setFavorite`). |
| `packages/presets/scripts/import-cheats.mjs` | **Rewrite.** Drop SQLite; upsert into files via the store; selftest retargeted. |
| `packages/presets/src/flows-store.mjs` | **New.** Flow `<slug>.json` format + IO. |
| `packages/presets/src/flows.ts` | **Rewrite.** Thin typed wrapper (same exports incl. `seedFlows`, `SlugCollisionError`). |
| `packages/presets/src/flows.test.mjs` | **New.** CRUD + collision + seed tests (`--experimental-strip-types`). |
| `packages/presets/src/migrations/00{2..5}_*.sql` | **Delete.** They only created the removed tables. |
| `packages/presets/src/schema.sql` | **Edit.** Drop cheats/flows DDL (presets-only snapshot). |
| `packages/presets/scripts/migrate-to-files.mjs` | **New.** One-time DB→files migration + table drop. |
| `CLAUDE.md`, `.claude/skills/cheats/SKILL.md`, `.claude/commands/skill-lector/cheats.md` | **Edit.** Update storage references (DB → files). |

Unchanged: `db.ts`, all `apps/web/**`, presets/pins/apply_log code.

---

### Task 1: cheats-store.mjs — format + IO + upsert

**Files:**
- Create: `packages/presets/src/cheats-store.mjs`
- Test: `packages/presets/src/cheats-store.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `packages/presets/src/cheats-store.test.mjs`:

```js
// Run: node packages/presets/src/cheats-store.test.mjs
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    serializeCheat, parseCheatText, writeCheatAtomic, readCheat,
    listCheatFiles, nextCheatId, upsertMany, listHashes, keyOf,
} from "./cheats-store.mjs";

const tmp = join(homedir(), ".skills-lector", `cheats-store-test-${process.pid}`);
process.env.SKILLS_LECTOR_STORE = tmp;

function mk(over = {}) {
    return {
        id: 1, promptHash: "h1", original: "do the thing", improved: "kindly do the thing",
        intent: "task", tags: ["a", "b"], reuseScore: 90, project: "/p", occurrences: 3,
        provenance: "typed", favorite: false, favoritedAt: null,
        firstSeenAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-02-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z", ...over,
    };
}

try {
    // round-trip: serialize then parse yields an equal object
    const c = mk();
    const round = parseCheatText(serializeCheat(c), c.id);
    assert.deepEqual(round, c, "round-trip equality");

    // multi-line original survives in the body
    const big = mk({ id: 2, promptHash: "h2", original: "line1\nline2\n  indented", improved: null, project: null });
    const r2 = parseCheatText(serializeCheat(big), 2);
    assert.equal(r2.original, "line1\nline2\n  indented", "multi-line original preserved");
    assert.equal(r2.improved, null, "null improved round-trips");

    // write + read by id, id comes from the filename
    writeCheatAtomic(c);
    assert.equal(readCheat(1).promptHash, "h1", "readCheat by id");
    assert.equal(nextCheatId(), 2, "nextCheatId = max+1");

    // upsert preserves favorite/favoritedAt/id/createdAt and does not downgrade typed
    writeCheatAtomic(mk({ id: 5, promptHash: keyOf("reuse me"), original: "reuse me", favorite: true, favoritedAt: "2026-03-01T00:00:00.000Z", provenance: "typed" }));
    const now = "2026-04-01T00:00:00.000Z";
    const res = upsertMany([{ original: "reuse me", improved: "v2", occurrences: 9, provenance: "legacy" }], now);
    assert.equal(res.imported, 1, "upsert updates 1");
    const updated = readCheat(5);
    assert.equal(updated.id, 5, "id preserved on upsert");
    assert.equal(updated.improved, "v2", "analysis updated");
    assert.equal(updated.occurrences, 9, "occurrences updated");
    assert.equal(updated.favorite, true, "favorite preserved");
    assert.equal(updated.favoritedAt, "2026-03-01T00:00:00.000Z", "favoritedAt preserved");
    assert.equal(updated.createdAt, mk().createdAt, "createdAt preserved");
    assert.equal(updated.provenance, "typed", "typed not downgraded");

    // new prompt gets a fresh id; caller-supplied hash is ignored
    const res2 = upsertMany([{ hash: "attacker", original: "brand new", provenance: "typed" }], now);
    assert.equal(res2.cheats[0].promptHash, keyOf("brand new"), "hash recomputed from original");
    assert.ok(res2.cheats[0].id > 5, "new cheat gets fresh id");

    // blank/null rows are skipped
    const res3 = upsertMany([{ original: "" }, null, { original: "ok one" }], now);
    assert.equal(res3.skipped, 2, "blank/null skipped");
    assert.equal(res3.imported, 1, "valid imported");

    assert.ok(listHashes().includes(keyOf("reuse me")), "listHashes includes stored row");
    console.log("OK cheats-store");
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node packages/presets/src/cheats-store.test.mjs`
Expected: FAIL — `Cannot find module './cheats-store.mjs'`.

- [ ] **Step 3: Write the implementation**

Create `packages/presets/src/cheats-store.mjs`:

```js
// packages/presets/src/cheats-store.mjs
// Single source of the cheat-on-disk format + IO. Plain JS because the cheat
// importer (scripts/import-cheats.mjs) runs under bare `node` and cannot import
// TS; cheats.ts imports this too (allowJs). ONE module means writer and reader
// can never drift — a format mismatch would silently corrupt files.
import yaml from "js-yaml";
import {
    mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, existsSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

/** @typedef {import("./types.js").Cheat} Cheat */

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n?---[ \t]*\r?\n?/;

function expandHome(p) {
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) return join(homedir(), p.slice(2));
    return p;
}

/** Cheats store dir; honors SKILLS_LECTOR_STORE (selftests point it at a tmp dir). */
export function cheatsDir() {
    const root = process.env.SKILLS_LECTOR_STORE && process.env.SKILLS_LECTOR_STORE.trim();
    const base = root ? expandHome(root) : join(homedir(), ".skills-lector", "store");
    return join(base, "cheats");
}

function cheatPath(id) {
    return join(cheatsDir(), `${id}.md`);
}

function provenanceOf(v) {
    return v === "typed" ? "typed" : "legacy";
}

function hashOf(s) {
    return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Canonical identity hash — MUST match extract.mjs (collapse whitespace + lowercase, sha256/16). */
export function keyOf(original) {
    return hashOf(original.replace(/\s+/g, " ").trim().toLowerCase());
}

function clampScore(v) {
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, Math.round(v)));
}

function isIsoDate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Serialize a cheat to its `<id>.md` text. id lives in the filename, not the body. */
export function serializeCheat(cheat) {
    const data = {
        promptHash: cheat.promptHash,
        intent: cheat.intent ?? null,
        tags: Array.isArray(cheat.tags) ? cheat.tags : [],
        reuseScore: cheat.reuseScore ?? null,
        project: cheat.project ?? null,
        occurrences: cheat.occurrences,
        provenance: provenanceOf(cheat.provenance),
        improved: cheat.improved ?? null,
        favorite: !!cheat.favorite,
        favoritedAt: cheat.favoritedAt ?? null,
        firstSeenAt: cheat.firstSeenAt,
        lastSeenAt: cheat.lastSeenAt,
        createdAt: cheat.createdAt,
        updatedAt: cheat.updatedAt,
    };
    const block = yaml.dump(data, { lineWidth: -1 });
    // ponytail: a single trailing newline at EOF is normalized (added here, stripped
    // on parse). Prompts don't depend on a trailing newline; exact-byte fidelity here
    // would mean storing the original with no EOF newline (uglier files).
    const body = cheat.original.endsWith("\n") ? cheat.original : cheat.original + "\n";
    return `---\n${block}---\n${body}`;
}

/** Parse `<id>.md` text + its numeric id into a cheat object. Throws on missing frontmatter. */
export function parseCheatText(text, id) {
    const match = text.match(FRONTMATTER_RE);
    if (!match) throw new Error(`cheat ${id}: missing frontmatter`);
    const loaded = yaml.load(match[1]);
    const d = loaded && typeof loaded === "object" && !Array.isArray(loaded) ? loaded : {};
    const original = text.slice(match[0].length).replace(/\n$/, "");
    return {
        id,
        promptHash: String(d.promptHash ?? ""),
        original,
        improved: typeof d.improved === "string" ? d.improved : null,
        intent: typeof d.intent === "string" ? d.intent : null,
        tags: Array.isArray(d.tags) ? d.tags.filter((t) => typeof t === "string") : [],
        reuseScore: Number.isFinite(d.reuseScore) ? d.reuseScore : null,
        project: typeof d.project === "string" ? d.project : null,
        occurrences: Number.isFinite(d.occurrences) ? d.occurrences : 1,
        provenance: provenanceOf(d.provenance),
        favorite: d.favorite === true,
        favoritedAt: typeof d.favoritedAt === "string" ? d.favoritedAt : null,
        firstSeenAt: String(d.firstSeenAt ?? ""),
        lastSeenAt: String(d.lastSeenAt ?? ""),
        createdAt: String(d.createdAt ?? ""),
        updatedAt: String(d.updatedAt ?? ""),
    };
}

/** Atomic write of one cheat to `<id>.md` (temp + rename, exFAT-safe). Returns the cheat. */
export function writeCheatAtomic(cheat) {
    const dir = cheatsDir();
    mkdirSync(dir, { recursive: true });
    const path = cheatPath(cheat.id);
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, serializeCheat(cheat), "utf8");
    renameSync(tmp, path);
    return cheat;
}

/** List every cheat file. Returns { cheats, errors }; one bad file never breaks the list. */
export function listCheatFiles() {
    const dir = cheatsDir();
    if (!existsSync(dir)) return { cheats: [], errors: [] };
    const cheats = [];
    const errors = [];
    for (const f of readdirSync(dir)) {
        const m = /^(\d+)\.md$/.exec(f);
        if (!m) continue;
        const id = Number(m[1]);
        try {
            cheats.push(parseCheatText(readFileSync(join(dir, f), "utf8"), id));
        } catch (e) {
            errors.push(`${f}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return { cheats, errors };
}

/** Read one cheat by id, or null. */
export function readCheat(id) {
    const path = cheatPath(id);
    if (!existsSync(path)) return null;
    try {
        return parseCheatText(readFileSync(path, "utf8"), id);
    } catch {
        return null;
    }
}

/** Highest existing id + 1 (1 on empty dir). */
export function nextCheatId() {
    let max = 0;
    for (const c of listCheatFiles().cheats) if (c.id > max) max = c.id;
    return max + 1;
}

/** Every stored promptHash (feeds extract --only-new). */
export function listHashes() {
    return listCheatFiles().cheats.map((c) => c.promptHash);
}

/**
 * Upsert analyzed cheats into files, keyed by promptHash (NOT id). On update,
 * preserves id, favorite, favoritedAt, createdAt, and never downgrades `typed`→
 * `legacy`. NEVER writes favorite for new rows (defaults false). Recomputes the
 * hash from `original` (caller-supplied hash ignored). Returns
 * { imported, skipped, cheats } — cheats in input order, null for skipped rows.
 */
export function upsertMany(rows, now) {
    const existing = listCheatFiles().cheats;
    const byHash = new Map();
    let maxId = 0;
    for (const c of existing) {
        byHash.set(c.promptHash, c);
        if (c.id > maxId) maxId = c.id;
    }
    let imported = 0;
    let skipped = 0;
    const out = [];
    for (const r of rows) {
        if (!r || typeof r.original !== "string" || !r.original.trim()) {
            skipped++;
            out.push(null);
            continue;
        }
        const original = r.original;
        const hash = keyOf(original);
        const prev = byHash.get(hash);
        const cheat = {
            id: prev ? prev.id : ++maxId,
            promptHash: hash,
            original,
            improved: typeof r.improved === "string" ? r.improved : null,
            intent: typeof r.intent === "string" ? r.intent : null,
            tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === "string") : [],
            reuseScore: clampScore(r.reuseScore),
            project: typeof r.project === "string" ? r.project : null,
            occurrences: Number.isFinite(r.occurrences) ? Math.max(1, Math.round(r.occurrences)) : 1,
            provenance: prev && prev.provenance === "typed" ? "typed" : provenanceOf(r.provenance),
            favorite: prev ? prev.favorite : false,
            favoritedAt: prev ? prev.favoritedAt : null,
            firstSeenAt: isIsoDate(r.firstSeenAt) ? r.firstSeenAt : now,
            lastSeenAt: isIsoDate(r.lastSeenAt) ? r.lastSeenAt : now,
            createdAt: prev ? prev.createdAt : now,
            updatedAt: now,
        };
        writeCheatAtomic(cheat);
        byHash.set(hash, cheat);
        imported++;
        out.push(cheat);
    }
    return { imported, skipped, cheats: out };
}

/** Single-row convenience for offline generators: returns the resulting cheat (with id). */
export function upsertByHash(row, now) {
    return upsertMany([row], now).cheats[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node packages/presets/src/cheats-store.test.mjs`
Expected: `OK cheats-store`.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/src/cheats-store.mjs packages/presets/src/cheats-store.test.mjs
git commit -m "feat(presets): cheat file-store (markdown format + hash upsert)"
```

---

### Task 2: cheats.ts — thin typed wrapper

**Files:**
- Modify (full rewrite): `packages/presets/src/cheats.ts`

- [ ] **Step 1: Rewrite the module**

Replace the entire contents of `packages/presets/src/cheats.ts` with:

```ts
// packages/presets/src/cheats.ts
// Read side of the Cheats feature + the single favorite mutation. The on-disk
// format + IO live in cheats-store.mjs (shared with scripts/import-cheats.mjs so
// the writer and reader can't drift). This module is the typed surface the web
// imports; signatures are unchanged from the previous SQLite implementation.
import {
    listCheatFiles,
    readCheat,
    writeCheatAtomic,
} from "./cheats-store.mjs";
import { nowIso } from "./util";
import type { Cheat } from "./types";

/** All cheats, favorites first then most-recently-seen. */
export function listCheats(): Cheat[] {
    const cheats = listCheatFiles().cheats as Cheat[];
    return cheats.sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.lastSeenAt.localeCompare(a.lastSeenAt);
    });
}

/** Returns a single cheat by numeric id, or null if not found. */
export function getCheat(id: number): Cheat | null {
    return readCheat(id) as Cheat | null;
}

/** Toggle a favorite. Returns the updated cheat, or null if the id is unknown. */
export function setFavorite(id: number, on: boolean): Cheat | null {
    const cheat = readCheat(id) as Cheat | null;
    if (!cheat) return null;
    const updated: Cheat = {
        ...cheat,
        favorite: on,
        favoritedAt: on ? nowIso() : null,
    };
    writeCheatAtomic(updated);
    return updated;
}
```

- [ ] **Step 2: Type-check via build**

Run: `npm run build` (ensure the dev server is stopped first — the build shares `apps/web/.next` and will 500 a live server).
Expected: build completes; no type errors referencing `cheats.ts`.

> Note: at this point the Cheats page will read from an (empty) `store/cheats` dir until Task 8's migration runs. That is expected on the branch.

- [ ] **Step 3: Commit**

```bash
git add packages/presets/src/cheats.ts
git commit -m "refactor(presets): cheats.ts reads/writes files via cheat store"
```

---

### Task 3: import-cheats.mjs — drop SQLite, write files

**Files:**
- Modify (full rewrite): `packages/presets/scripts/import-cheats.mjs`

- [ ] **Step 1: Rewrite the script**

Replace the entire contents of `packages/presets/scripts/import-cheats.mjs` with:

```js
#!/usr/bin/env node
// Writer half of the Cheats generator. Reads .cheats/analyzed.json and upserts
// cheat markdown files under ~/.skills-lector/store/cheats via the shared
// cheats-store module (the same format the web reader uses). Run:
//   node packages/presets/scripts/import-cheats.mjs [path/to/analyzed.json]
//   node packages/presets/scripts/import-cheats.mjs known-hashes [outfile]
//   node packages/presets/scripts/import-cheats.mjs selftest
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
    upsertMany, listHashes, listCheatFiles, readCheat, writeCheatAtomic,
    keyOf, cheatsDir,
} from "../src/cheats-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repo root = 3 levels up from this script (packages/presets/scripts/). */
function repoRoot() {
    return join(HERE, "..", "..", "..");
}

/** Where extract.mjs looks for the already-imported hash set (--only-new input). */
function knownHashesPath(arg) {
    return arg && String(arg).trim()
        ? String(arg).trim()
        : join(repoRoot(), ".cheats", "known-hashes.json");
}

/** Dump every stored prompt_hash so extract.mjs --only-new can skip them. */
function writeKnownHashes(outPath) {
    const hashes = listHashes();
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(hashes));
    return hashes.length;
}

/** Upsert analyzed cheats into files. NEVER writes favorite — the web owns that. */
function importCheats(cheats) {
    const now = new Date().toISOString();
    const { imported, skipped } = upsertMany(cheats, now);
    return { imported, skipped };
}

function assert(cond, msg) {
    if (!cond) throw new Error(`FAIL: ${msg}`);
}

function selftest() {
    const tmp = join(homedir(), ".skills-lector", `cheats-selftest-${process.pid}`);
    process.env.SKILLS_LECTOR_STORE = tmp;
    try {
        const k1 = keyOf("do X");

        // 1. first import: caller-supplied hash ignored; missing provenance → legacy
        let res = importCheats([{ hash: "attacker", original: "do X", improved: "please do X", intent: "task", tags: ["a"], reuseScore: 70, occurrences: 2 }]);
        assert(res.imported === 1, "first import inserts 1");
        const a1 = listCheatFiles().cheats;
        const c1 = a1.find((c) => c.promptHash === k1);
        assert(c1, "row stored under recomputed hash");
        assert(!a1.find((c) => c.promptHash === "attacker"), "caller-supplied hash MUST be ignored");
        assert(c1.provenance === "legacy", "missing provenance defaults to legacy");
        const firstId = c1.id;

        // 2. user favorites it (web write, simulated via the store)
        writeCheatAtomic({ ...c1, favorite: true, favoritedAt: new Date().toISOString() });

        // 3. re-import with changed analysis, now proven typed
        importCheats([{ original: "do X", improved: "kindly do X", intent: "task", tags: ["a", "b"], reuseScore: 90, occurrences: 5, provenance: "typed" }]);
        const r3 = readCheat(firstId);
        assert(r3.id === firstId, "id stable across re-import");
        assert(r3.improved === "kindly do X", "analysis updates on re-import");
        assert(r3.occurrences === 5, "occurrences update on re-import");
        assert(r3.tags.length === 2, "tags update on re-import");
        assert(r3.provenance === "typed", "provenance updates to typed");
        assert(r3.favorite === true, "favorite preserved across re-import");
        assert(r3.favoritedAt, "favoritedAt preserved across re-import");

        // 4. once typed, a later legacy sighting must NOT downgrade
        importCheats([{ original: "do X", improved: "kindly do X", occurrences: 5, provenance: "legacy" }]);
        assert(readCheat(firstId).provenance === "typed", "typed MUST NOT downgrade to legacy");

        // 5. malformed dates rejected; blank/null rows skipped
        importCheats([{ original: "ts probe", firstSeenAt: "ZZZZ", lastSeenAt: "2026-01-02T03:04:05.000Z" }]);
        const ts = listCheatFiles().cheats.find((c) => c.promptHash === keyOf("ts probe"));
        assert(/^\d{4}-\d{2}-\d{2}T/.test(ts.firstSeenAt), "malformed firstSeenAt falls back to iso");
        assert(ts.lastSeenAt === "2026-01-02T03:04:05.000Z", "valid lastSeenAt preserved");
        res = importCheats([{ original: "" }, null, { original: "valid new one" }]);
        assert(res.skipped === 2, "blank/null rows skipped");
        assert(res.imported === 1, "the one valid row imports");

        // 6. known-hashes dump reflects stored rows
        const hp = join(tmp, "hashes.json");
        const n = writeKnownHashes(hp);
        assert(n >= 1, "writeKnownHashes dumps at least one hash");
        const dumped = JSON.parse(readFileSync(hp, "utf8"));
        assert(dumped.includes(k1), "dump includes the known row");
        assert(dumped.includes(keyOf("valid new one")), "dump includes a freshly imported row");

        console.log("OK import-cheats selftest");
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function main() {
    const arg = process.argv[2];
    if (arg === "selftest") return selftest();

    if (arg === "known-hashes") {
        const outPath = knownHashesPath(process.argv[3]);
        const n = writeKnownHashes(outPath);
        console.log(`[cheats] wrote ${n} known hash(es) → ${outPath}`);
        return;
    }

    const file = arg || ".cheats/analyzed.json";
    if (!existsSync(file)) {
        console.error(`[cheats] analyzed file not found: ${file}`);
        process.exit(1);
    }
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        console.error(`[cheats] invalid JSON in ${file}: ${e.message}`);
        process.exit(1);
    }
    const cheats = Array.isArray(parsed?.cheats) ? parsed.cheats : [];
    const { imported, skipped } = importCheats(cheats);
    console.log(`[cheats] imported ${imported}, skipped ${skipped} → ${cheatsDir()}`);
    try {
        const kp = knownHashesPath();
        const n = writeKnownHashes(kp);
        console.log(`[cheats] refreshed ${n} known hash(es) → ${kp} (next extract skips these unless --full)`);
    } catch (e) {
        console.error(`[cheats] warning: could not write known-hashes (${e instanceof Error ? e.message : String(e)}); next extract will run full`);
    }
}

try {
    main();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
}
```

- [ ] **Step 2: Run the selftest to verify it passes**

Run: `node packages/presets/scripts/import-cheats.mjs selftest`
Expected: `OK import-cheats selftest`.

- [ ] **Step 3: Commit**

```bash
git add packages/presets/scripts/import-cheats.mjs
git commit -m "refactor(presets): import-cheats writes files via cheat store, drops sqlite"
```

---

### Task 4: flows-store.mjs — JSON format + IO

**Files:**
- Create: `packages/presets/src/flows-store.mjs`

(Tested through `flows.ts` in Task 5; this task adds the module and confirms the build.)

- [ ] **Step 1: Write the module**

Create `packages/presets/src/flows-store.mjs`:

```js
// packages/presets/src/flows-store.mjs
// Single source of the flow-on-disk format + IO: one JSON file per flow, named
// by slug. Plain JS so a future offline flow-generator (.mjs) can write flows the
// same way the cheat importer writes cheats; flows.ts imports it too. id is kept
// inside the file for URL stability; the filename is the slug.
import {
    mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** @typedef {import("./types.js").Flow} Flow */

function expandHome(p) {
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) return join(homedir(), p.slice(2));
    return p;
}

/** Flows store dir; honors SKILLS_LECTOR_STORE (selftests point it at a tmp dir). */
export function flowsDir() {
    const root = process.env.SKILLS_LECTOR_STORE && process.env.SKILLS_LECTOR_STORE.trim();
    const base = root ? expandHome(root) : join(homedir(), ".skills-lector", "store");
    return join(base, "flows");
}

function flowPath(slug) {
    return join(flowsDir(), `${slug}.json`);
}

function normalizeEnhanced(v) {
    if (!v || typeof v !== "object" || !Array.isArray(v.steps)) return null;
    const steps = v.steps
        .filter((s) => s && typeof s === "object" && Number.isInteger(s.cheatId) && typeof s.enhanced === "string")
        .map((s) => ({
            cheatId: s.cheatId,
            enhanced: s.enhanced,
            foldedIn: Array.isArray(s.foldedIn) ? s.foldedIn.filter((x) => typeof x === "string") : [],
        }));
    if (steps.length === 0) return null;
    return { generatedAt: typeof v.generatedAt === "string" ? v.generatedAt : "", steps };
}

/** Coerce a parsed JSON object into a Flow (tolerant of legacy/partial data). */
export function normalizeFlow(d) {
    return {
        id: Number.isFinite(d.id) ? d.id : 0,
        slug: String(d.slug ?? ""),
        name: String(d.name ?? d.slug ?? ""),
        description: typeof d.description === "string" ? d.description : null,
        steps: Array.isArray(d.steps) ? d.steps.filter((n) => Number.isInteger(n)) : [],
        seeded: d.seeded === true,
        enhanced: normalizeEnhanced(d.enhanced),
        createdAt: String(d.createdAt ?? ""),
        updatedAt: String(d.updatedAt ?? ""),
    };
}

/** Atomic write of one flow to `<slug>.json` (temp + rename, exFAT-safe). Returns the flow. */
export function writeFlowAtomic(flow) {
    const dir = flowsDir();
    mkdirSync(dir, { recursive: true });
    const path = flowPath(flow.slug);
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(flow, null, 2) + "\n", "utf8");
    renameSync(tmp, path);
    return flow;
}

/** List every flow file. Returns { flows, errors }; one bad file never breaks the list. */
export function listFlowFiles() {
    const dir = flowsDir();
    if (!existsSync(dir)) return { flows: [], errors: [] };
    const flows = [];
    const errors = [];
    for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        try {
            flows.push(normalizeFlow(JSON.parse(readFileSync(join(dir, f), "utf8"))));
        } catch (e) {
            errors.push(`${f}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return { flows, errors };
}

/** Read one flow by slug, or null. */
export function readFlowBySlug(slug) {
    const path = flowPath(slug);
    if (!existsSync(path)) return null;
    try {
        return normalizeFlow(JSON.parse(readFileSync(path, "utf8")));
    } catch {
        return null;
    }
}

/** Read one flow by numeric id (scans the dir), or null. */
export function readFlowById(id) {
    return listFlowFiles().flows.find((f) => f.id === id) ?? null;
}

/** Highest existing id + 1 (1 on empty dir). */
export function nextFlowId() {
    let max = 0;
    for (const f of listFlowFiles().flows) if (f.id > max) max = f.id;
    return max + 1;
}

/** True if a flow file with this slug exists. */
export function flowExists(slug) {
    return existsSync(flowPath(slug));
}

/** Delete a flow file by slug (no-op if absent). */
export function deleteFlowFile(slug) {
    const path = flowPath(slug);
    if (existsSync(path)) rmSync(path, { force: true });
}
```

- [ ] **Step 2: Sanity-check the module loads**

Run: `node -e "import('./packages/presets/src/flows-store.mjs').then(m => console.log(Object.keys(m).join(',')))"`
Expected: prints the exported names (`flowsDir,normalizeFlow,writeFlowAtomic,listFlowFiles,readFlowBySlug,readFlowById,nextFlowId,flowExists,deleteFlowFile`).

- [ ] **Step 3: Commit**

```bash
git add packages/presets/src/flows-store.mjs
git commit -m "feat(presets): flow file-store (one JSON per slug)"
```

---

### Task 5: flows.ts — thin typed wrapper + tests

**Files:**
- Modify (full rewrite): `packages/presets/src/flows.ts`
- Test: `packages/presets/src/flows.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `packages/presets/src/flows.test.mjs`:

```js
// Run: node --experimental-strip-types packages/presets/src/flows.test.mjs
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    listFlows, getFlow, getFlowBySlug, createFlow, updateFlow,
    setFlowSteps, setFlowEnhanced, deleteFlow, seedFlows, SlugCollisionError,
} from "./flows.ts";
import { writeCheatAtomic } from "./cheats-store.mjs";

const tmp = join(homedir(), ".skills-lector", `flows-test-${process.pid}`);
process.env.SKILLS_LECTOR_STORE = tmp;

function cheat(id, intent, score) {
    return {
        id, promptHash: `h${id}`, original: `prompt ${id}`, improved: null,
        intent, tags: [], reuseScore: score, project: null, occurrences: 1,
        provenance: "legacy", favorite: false, favoritedAt: null,
        firstSeenAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
}

try {
    // create → get by id + slug
    const f = createFlow({ slug: "feature", name: "Feature" });
    assert.equal(f.id, 1, "first flow id = 1");
    assert.equal(getFlow(f.id).slug, "feature", "getFlow by id");
    assert.equal(getFlowBySlug("feature").id, f.id, "getFlowBySlug");

    // duplicate slug throws
    assert.throws(() => createFlow({ slug: "feature", name: "dup" }), SlugCollisionError, "duplicate slug");

    // update name/description, set steps, set enhanced
    updateFlow(f.id, { name: "Renamed", description: "d" });
    assert.equal(getFlow(f.id).name, "Renamed", "name updated");
    setFlowSteps(f.id, [10, 20, 30]);
    assert.deepEqual(getFlow(f.id).steps, [10, 20, 30], "steps set");
    setFlowEnhanced(f.id, [{ cheatId: 10, enhanced: "do it", foldedIn: ["git"] }]);
    assert.equal(getFlow(f.id).enhanced.steps[0].cheatId, 10, "enhanced set");
    assert.equal(getFlow(f.id).enhanced.steps[0].foldedIn[0], "git", "foldedIn kept");

    // second flow → list sorts most-recently-updated first
    createFlow({ slug: "chore", name: "Chore" });
    assert.equal(listFlows()[0].slug, "chore", "newest flow first");

    // delete
    deleteFlow(f.id);
    assert.equal(getFlow(f.id), null, "deleted flow gone");

    // seedFlows: group cheats by intent, ≥2 per group, idempotent
    writeCheatAtomic(cheat(101, "debugging", 90));
    writeCheatAtomic(cheat(102, "debugging", 80));
    writeCheatAtomic(cheat(103, "solo", 50));
    const seeded = seedFlows();
    assert.equal(seeded.created.length, 1, "one group (debugging) seeded");
    assert.equal(seeded.created[0].slug, "debugging", "seeded slug from intent");
    assert.deepEqual(seeded.created[0].steps, [101, 102], "steps sorted by reuseScore desc");
    assert.equal(seedFlows().created.length, 0, "seedFlows idempotent");

    console.log("OK flows");
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types packages/presets/src/flows.test.mjs`
Expected: FAIL — the current `flows.ts` still uses SQLite (`openDb`) and will throw or mismatch against the file store.

- [ ] **Step 3: Rewrite the module**

Replace the entire contents of `packages/presets/src/flows.ts` with:

```ts
// packages/presets/src/flows.ts
// Read + write module for Flows — ordered cheat sequences for a kind of work.
// The on-disk format + IO live in flows-store.mjs (one JSON file per slug, shared
// so an offline .mjs generator can write flows too). Signatures are unchanged from
// the previous SQLite implementation; slug is immutable so files never get renamed.
import {
    listFlowFiles, readFlowById, readFlowBySlug, writeFlowAtomic,
    deleteFlowFile, nextFlowId, flowExists,
} from "./flows-store.mjs";
import { nowIso } from "./util";
import { listCheats } from "./cheats";
import type { Flow, FlowEnhancedStep, FlowEnhancement } from "./types";

// ---------------------------------------------------------------------------
// Slug collision error — mirrors presets.ts
// ---------------------------------------------------------------------------

export class SlugCollisionError extends Error {
    constructor(slug: string) {
        super(`Flow slug already exists: ${slug}`);
        this.name = "SlugCollisionError";
    }
}

function requireFlow(id: number): Flow {
    const flow = getFlow(id);
    if (!flow) throw new Error(`Flow not found: ${id}`);
    return flow;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** All flows, most-recently-updated first. */
export function listFlows(): Flow[] {
    const flows = listFlowFiles().flows as Flow[];
    return flows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Single flow by numeric id, or null if not found. */
export function getFlow(id: number): Flow | null {
    return readFlowById(id) as Flow | null;
}

/** Single flow by slug, or null if not found. */
export function getFlowBySlug(slug: string): Flow | null {
    return readFlowBySlug(slug) as Flow | null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type CreateFlowInput = {
    slug: string;
    name: string;
    description?: string | null;
};

/** Creates a new flow. Throws SlugCollisionError if the slug is already taken. */
export function createFlow(input: CreateFlowInput): Flow {
    if (flowExists(input.slug)) throw new SlugCollisionError(input.slug);
    const ts = nowIso();
    const flow: Flow = {
        id: nextFlowId(),
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        steps: [],
        seeded: false,
        enhanced: null,
        createdAt: ts,
        updatedAt: ts,
    };
    writeFlowAtomic(flow);
    return flow;
}

export type UpdateFlowInput = {
    name?: string;
    description?: string | null;
};

/** Updates name and/or description of a flow. Throws if id is unknown. */
export function updateFlow(id: number, input: UpdateFlowInput): Flow {
    const current = requireFlow(id);
    const next: Flow = {
        ...current,
        name: input.name ?? current.name,
        description: input.description === undefined ? current.description : input.description,
        updatedAt: nowIso(),
    };
    writeFlowAtomic(next);
    return next;
}

/** Replaces the ordered step list for a flow. Throws if id is unknown. */
export function setFlowSteps(id: number, cheatIds: number[]): Flow {
    const current = requireFlow(id);
    const next: Flow = { ...current, steps: cheatIds, updatedAt: nowIso() };
    writeFlowAtomic(next);
    return next;
}

/**
 * Stores the per-step skill-aware rewrite for a flow. `generatedAt` is stamped
 * server-side. Steps are keyed by cheatId; callers pass only the steps they
 * enhanced (others render un-enhanced). Throws if id is unknown.
 */
export function setFlowEnhanced(id: number, steps: FlowEnhancedStep[]): Flow {
    const current = requireFlow(id);
    const ts = nowIso();
    const enhanced: FlowEnhancement = { generatedAt: ts, steps };
    const next: Flow = { ...current, enhanced, updatedAt: ts };
    writeFlowAtomic(next);
    return next;
}

/** Permanently deletes a flow. */
export function deleteFlow(id: number): void {
    const flow = getFlow(id);
    if (flow) deleteFlowFile(flow.slug);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export type SeedResult = { created: Flow[] };

const MAX_SEEDED_STEPS = 8;

/**
 * Auto-seed starter flows from existing cheats: group by intent (skip empty),
 * keep groups with ≥2 cheats, take the top MAX_SEEDED_STEPS by reuseScore desc
 * then occurrences desc. Idempotent: skips an intent whose slug file exists.
 */
export function seedFlows(): SeedResult {
    const cheats = listCheats();
    const byIntent = new Map<string, typeof cheats>();

    for (const cheat of cheats) {
        if (!cheat.intent || !cheat.intent.trim()) continue;
        const key = cheat.intent.trim();
        const group = byIntent.get(key);
        if (group) group.push(cheat);
        else byIntent.set(key, [cheat]);
    }

    const created: Flow[] = [];

    for (const [intent, group] of byIntent) {
        if (group.length < 2) continue;

        const slug = toFlowSlug(intent);
        if (flowExists(slug)) continue; // already exists — skip (idempotent)

        const sorted = [...group].sort((a, b) => {
            const scoreA = a.reuseScore ?? -Infinity;
            const scoreB = b.reuseScore ?? -Infinity;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return b.occurrences - a.occurrences;
        });

        const ts = nowIso();
        const flow: Flow = {
            id: nextFlowId(),
            slug,
            name: intent,
            description: null,
            steps: sorted.slice(0, MAX_SEEDED_STEPS).map((c) => c.id),
            seeded: true,
            enhanced: null,
            createdAt: ts,
            updatedAt: ts,
        };
        writeFlowAtomic(flow);
        created.push(flow);
    }

    return { created };
}

// ---------------------------------------------------------------------------
// Internal: kebab-case slug from intent string
// ---------------------------------------------------------------------------

/**
 * Converts an intent string to a URL-safe kebab slug. Non-alphanumerics → `-`,
 * collapsed, trimmed. An intent with no alphanumerics falls back to `flow-<hash>`
 * (stable per-intent so re-seeding reproduces the same slug — keeps seedFlows
 * idempotent and avoids two symbol-only intents colliding on a bare `flow`).
 */
function toFlowSlug(intent: string): string {
    const slug = intent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
    if (slug) return slug;
    let hash = 0;
    for (let i = 0; i < intent.length; i++) {
        hash = (hash * 31 + intent.charCodeAt(i)) >>> 0;
    }
    return `flow-${hash.toString(36)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types packages/presets/src/flows.test.mjs`
Expected: `OK flows`.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/src/flows.ts packages/presets/src/flows.test.mjs
git commit -m "refactor(presets): flows.ts reads/writes files via flow store"
```

---

### Task 6: Remove cheats/flows DB migrations + schema snapshot

**Files:**
- Delete: `packages/presets/src/migrations/002_cheats.sql`, `003_cheats_provenance.sql`, `004_flows.sql`, `005_flow_enhanced.sql`
- Modify: `packages/presets/src/schema.sql`

- [ ] **Step 1: Confirm 001 is presets-only**

Run: `grep -l -i -e cheats -e flows packages/presets/src/migrations/001_initial.sql || echo "001 is presets-only"`
Expected: `001 is presets-only`. (If 001 references cheats/flows, stop and reassess — the plan assumes it does not.)

- [ ] **Step 2: Delete the four migrations**

```bash
git rm packages/presets/src/migrations/002_cheats.sql \
       packages/presets/src/migrations/003_cheats_provenance.sql \
       packages/presets/src/migrations/004_flows.sql \
       packages/presets/src/migrations/005_flow_enhanced.sql
```

> Safe because `db.ts` only compares the migration list to the `schema_version` high-water mark: existing DBs (v5) skip everything; fresh DBs apply only `001`. The cheats/flows tables on existing DBs are dropped by Task 7's migration script, not here.

- [ ] **Step 3: Update schema.sql**

Open `packages/presets/src/schema.sql`. Remove any `CREATE TABLE cheats`/`CREATE TABLE flows` (and their indexes) blocks so the snapshot documents only presets/pins/apply_log. If the file is purely a duplicate of `001_initial.sql`, make it match `001_initial.sql`. Add a one-line header comment:

```sql
-- Reference snapshot of the presets.db schema (presets / pins / apply_log only).
-- Cheats and Flows live in files under ~/.skills-lector/store (see flows-store.mjs / cheats-store.mjs).
```

- [ ] **Step 4: Verify the build + presets DB still open cleanly**

Run (dev server stopped): `npm run build`
Expected: build succeeds.

Run: `node -e "const m=require('./packages/presets/node_modules/better-sqlite3');const os=require('os'),p=require('path');const db=new m(p.join(os.homedir(),'.skills-lector','presets.db'),{readonly:true});console.log('presets table present:', !!db.prepare(\"SELECT 1 FROM sqlite_master WHERE type='table' AND name='presets'\").get());db.close()"`
Expected: `presets table present: true`.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/src/migrations packages/presets/src/schema.sql
git commit -m "chore(presets): drop cheats/flows migrations + schema snapshot (now file-backed)"
```

---

### Task 7: migrate-to-files.mjs — one-time DB→files migration

**Files:**
- Create: `packages/presets/scripts/migrate-to-files.mjs`

- [ ] **Step 1: Write the script**

Create `packages/presets/scripts/migrate-to-files.mjs`:

```js
#!/usr/bin/env node
// One-time migration: copy cheats + flows from presets.db into files under
// ~/.skills-lector/store, verify counts, back up the DB, then DROP the two
// tables. Safe to re-run: no-op once the tables are gone; refuses to overwrite a
// non-empty store/ without --force. Run with the dev server STOPPED.
//   node packages/presets/scripts/migrate-to-files.mjs [--force]
import Database from "better-sqlite3";
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeCheatAtomic, cheatsDir } from "../src/cheats-store.mjs";
import { writeFlowAtomic, flowsDir } from "../src/flows-store.mjs";

function resolveDbPath() {
    const env = process.env.SKILLS_LECTOR_PRESETS_DB && process.env.SKILLS_LECTOR_PRESETS_DB.trim();
    if (env) {
        if (env === "~") return homedir();
        if (env.startsWith("~/") || env.startsWith("~\\")) return join(homedir(), env.slice(2));
        return env;
    }
    return join(homedir(), ".skills-lector", "presets.db");
}

function tableExists(db, name) {
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function hasFiles(dir, ext) {
    return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith(ext));
}

function parseJsonArray(raw, isValid) {
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.filter(isValid) : [];
    } catch {
        return [];
    }
}

function parseEnhanced(raw) {
    if (!raw) return null;
    try {
        const v = JSON.parse(raw);
        return v && typeof v === "object" ? v : null;
    } catch {
        return null;
    }
}

function main() {
    const force = process.argv.includes("--force");
    const dbPath = resolveDbPath();
    if (!existsSync(dbPath)) {
        console.error(`[migrate] no database at ${dbPath}`);
        process.exit(1);
    }
    const db = new Database(dbPath);
    const hasCheats = tableExists(db, "cheats");
    const hasFlows = tableExists(db, "flows");
    if (!hasCheats && !hasFlows) {
        console.log("[migrate] cheats/flows tables already gone — nothing to do");
        db.close();
        return;
    }
    if (!force && (hasFiles(cheatsDir(), ".md") || hasFiles(flowsDir(), ".json"))) {
        console.error(`[migrate] store already has files:\n  ${cheatsDir()}\n  ${flowsDir()}\nRe-run with --force to overwrite.`);
        db.close();
        process.exit(1);
    }

    // cheats
    const cheatRows = hasCheats ? db.prepare("SELECT * FROM cheats").all() : [];
    for (const r of cheatRows) {
        writeCheatAtomic({
            id: r.id,
            promptHash: r.prompt_hash,
            original: r.original,
            improved: r.improved ?? null,
            intent: r.intent ?? null,
            tags: parseJsonArray(r.tags, (t) => typeof t === "string"),
            reuseScore: r.reuse_score ?? null,
            project: r.project ?? null,
            occurrences: r.occurrences,
            provenance: r.provenance === "typed" ? "typed" : "legacy",
            favorite: r.favorite === 1,
            favoritedAt: r.favorited_at ?? null,
            firstSeenAt: r.first_seen_at,
            lastSeenAt: r.last_seen_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        });
    }

    // flows
    const flowRows = hasFlows ? db.prepare("SELECT * FROM flows").all() : [];
    for (const r of flowRows) {
        writeFlowAtomic({
            id: r.id,
            slug: r.slug,
            name: r.name,
            description: r.description ?? null,
            steps: parseJsonArray(r.steps, (n) => Number.isInteger(n)),
            seeded: r.seeded === 1,
            enhanced: parseEnhanced(r.enhanced),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        });
    }

    // verify counts BEFORE any destructive step
    const wroteCheats = existsSync(cheatsDir())
        ? readdirSync(cheatsDir()).filter((f) => /^\d+\.md$/.test(f)).length
        : 0;
    const wroteFlows = existsSync(flowsDir())
        ? readdirSync(flowsDir()).filter((f) => f.endsWith(".json")).length
        : 0;
    if (wroteCheats < cheatRows.length || wroteFlows < flowRows.length) {
        console.error(`[migrate] count mismatch — cheats ${wroteCheats}/${cheatRows.length}, flows ${wroteFlows}/${flowRows.length}. ABORTING before drop.`);
        db.close();
        process.exit(1);
    }

    // checkpoint WAL into the main db so the backup copy is complete, then back up + drop
    db.pragma("wal_checkpoint(TRUNCATE)");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${dbPath}.bak-${stamp}`;
    copyFileSync(dbPath, bak);
    db.exec("DROP TABLE IF EXISTS cheats; DROP TABLE IF EXISTS flows;");
    db.close();

    console.log(`[migrate] cheats ${wroteCheats} → ${cheatsDir()}`);
    console.log(`[migrate] flows  ${wroteFlows} → ${flowsDir()}`);
    console.log(`[migrate] backup → ${bak}`);
    console.log("[migrate] dropped cheats + flows tables");
}

try {
    main();
} catch (e) {
    console.error(`[migrate] fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
}
```

- [ ] **Step 2: Dry-run safety check against a copy (does NOT touch the real DB)**

```bash
cp ~/.skills-lector/presets.db /tmp/lector-migrate-test.db
SKILLS_LECTOR_PRESETS_DB=/tmp/lector-migrate-test.db \
SKILLS_LECTOR_STORE=/tmp/lector-store-test \
  node packages/presets/scripts/migrate-to-files.mjs
```
Expected: prints `cheats 845 → …`, `flows 15 → …`, a backup path, and `dropped cheats + flows tables`. Then verify the copy lost its tables and a sample file looks right:
```bash
ls /tmp/lector-store-test/cheats | wc -l    # ~845
ls /tmp/lector-store-test/flows              # 15 *.json incl. feature.json, chore.json, config.json
node -e "const m=require('./packages/presets/node_modules/better-sqlite3');const db=new m('/tmp/lector-migrate-test.db',{readonly:true});console.log('cheats table gone:', !db.prepare(\"SELECT 1 FROM sqlite_master WHERE type='table' AND name='cheats'\").get());db.close()"
```
Expected: count ~845, the three enhanced flows present, `cheats table gone: true`. Clean up: `rm -rf /tmp/lector-store-test /tmp/lector-migrate-test.db*`.

- [ ] **Step 3: Commit**

```bash
git add packages/presets/scripts/migrate-to-files.mjs
git commit -m "feat(presets): one-time migrate-to-files script (db → store, then drop tables)"
```

---

### Task 8: Run the real migration, verify, update docs

**Files:**
- Modify: `CLAUDE.md`, `.claude/skills/cheats/SKILL.md`, `.claude/commands/skill-lector/cheats.md`

- [ ] **Step 1: Stop the dev server**

The migration drops tables and the running dev server holds a cached SQLite connection. Stop `dev:portless` by its exact port/PID (do NOT broad-`pkill`). Confirm nothing is serving on :4317.

- [ ] **Step 2: Run the real migration**

Run: `node packages/presets/scripts/migrate-to-files.mjs`
Expected: `cheats 845 → …/store/cheats`, `flows 15 → …/store/flows`, a `presets.db.bak-<ts>` path, `dropped cheats + flows tables`.

- [ ] **Step 3: Spot-check migrated files**

```bash
ls ~/.skills-lector/store/cheats | wc -l        # ~845
sed -n '1,20p' ~/.skills-lector/store/flows/feature.json   # has steps + enhanced
```
Expected: count matches; `feature.json`, `chore.json`, `config.json` each contain a non-null `enhanced` object with `steps`.

- [ ] **Step 4: Build, then start the dev server**

Run: `npm run build` → expect green.
Then restart `dev:portless` (the normal run mode on this machine).

- [ ] **Step 5: Manual UI verification**

Visit the dev URL and confirm:
- `/cheats` lists ~845 prompts; a detail page shows Original + Improved.
- Toggling a favorite persists across a reload (writes the `<id>.md` file).
- `/flows` lists 15 flows; open `feature` and confirm steps render and the enhanced rewrite shows.
- Create a flow, add steps, delete it — all succeed.

- [ ] **Step 6: Update docs**

In `CLAUDE.md`, update the Cheats/Flows storage descriptions: Cheats are markdown files at `~/.skills-lector/store/cheats/<id>.md`, Flows are JSON at `~/.skills-lector/store/flows/<slug>.json`; `presets.db` holds only presets/pins/apply_log. Note the importer writes files (no SQLite) and both stores are offline-writable from `.mjs`.

In `.claude/skills/cheats/SKILL.md` and `.claude/commands/skill-lector/cheats.md`, change any "upserts rows into presets.db / the `cheats` table" wording to "upserts cheat markdown files under `~/.skills-lector/store/cheats`".

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md .claude/skills/cheats/SKILL.md .claude/commands/skill-lector/cheats.md
git commit -m "docs: cheats + flows are file-backed under ~/.skills-lector/store"
```

---

## Self-review notes

- **Spec coverage:** layout (Task 1/4 dirs + filenames) · cheat md format (Task 1) · flow json format (Task 4) · id preservation (migration writes DB ids; `nextCheatId`/`nextFlowId` = max+1) · upsert returns cheat-with-id (Task 1 `upsertMany`/`upsertByHash`) · invariants favorite/typed/hash (Tasks 1+3 tests) · same exports (Tasks 2+5) · drop migrations + keep presets (Task 6) · destructive migration with backup + count gate (Task 7) · tests (Tasks 1,3,5,7) · docs (Task 8).
- **No placeholders:** every code step contains full module/file contents; every run step has an exact command + expected output.
- **Type/name consistency:** store exports (`listCheatFiles`, `readCheat`, `writeCheatAtomic`, `upsertMany`, `keyOf`, `cheatsDir`; `listFlowFiles`, `readFlowById`, `readFlowBySlug`, `writeFlowAtomic`, `nextFlowId`, `flowExists`, `deleteFlowFile`, `flowsDir`) are used identically across `cheats.ts`, `flows.ts`, `import-cheats.mjs`, `migrate-to-files.mjs`, and the tests. `Cheat`/`Flow`/`FlowEnhancement` shapes match `types.ts` (unchanged).
- **Known accepted behavior:** a single trailing-newline at cheat-body EOF is normalized (commented in `serializeCheat`); irrelevant for prompt reuse.
