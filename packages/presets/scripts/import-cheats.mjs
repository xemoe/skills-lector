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
