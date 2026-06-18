#!/usr/bin/env node
// Writer half of the Cheats generator. Reads .cheats/analyzed.json and upserts
// rows into the `cheats` table of presets.db. Lives inside packages/presets so
// `better-sqlite3` resolves from this package's node_modules (Node walks up from
// this file's directory). Run:
//   node packages/presets/scripts/import-cheats.mjs [path/to/analyzed.json]
//   node packages/presets/scripts/import-cheats.mjs selftest
import Database from "better-sqlite3";
import {
    mkdirSync,
    readFileSync,
    writeFileSync,
    readdirSync,
    existsSync,
    rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "..", "src", "migrations");

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

/**
 * Dump every prompt_hash currently in the library so extract.mjs --only-new can
 * skip them. Returns the count written. Shared by the import path (auto-refresh)
 * and the standalone `known-hashes` subcommand (seed an existing DB).
 */
function writeKnownHashes(db, outPath) {
    const rows = db.prepare("SELECT prompt_hash FROM cheats").all();
    const hashes = rows.map((r) => r.prompt_hash);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(hashes));
    return hashes.length;
}

function resolveDbPath() {
    const env = process.env.SKILLS_LECTOR_PRESETS_DB;
    if (env && env.trim()) {
        const p = env.trim();
        if (p === "~") return homedir();
        if (p.startsWith("~/") || p.startsWith("~\\")) return join(homedir(), p.slice(2));
        return p;
    }
    return join(homedir(), ".skills-lector", "presets.db");
}

// ponytail: ~15-line copy of db.ts's migration runner. The .mjs cannot import the
// TS module, so the runner is duplicated; the SQL itself is NOT duplicated (read
// from src/migrations). Upgrade path: delete this if packages/presets ever emits JS.
function runMigrations(db) {
    let current = 0;
    try {
        const row = db.prepare("SELECT MAX(version) AS v FROM schema_version").get();
        current = row?.v ?? 0;
    } catch {
        current = 0;
    }
    const files = existsSync(MIGRATIONS_DIR)
        ? readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()
        : [];
    for (const file of files) {
        const version = Number(file.slice(0, 3));
        if (version <= current) continue;
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        db.exec("BEGIN");
        try {
            db.exec(sql);
            db.exec("COMMIT");
        } catch (e) {
            db.exec("ROLLBACK");
            const msg = e instanceof Error ? e.message : String(e);
            // ponytail: mirror db.ts — a replayed "duplicate column"/"already exists"
            // means the schema is already there; record the version and converge.
            if (/duplicate column name|already exists/i.test(msg)) {
                db.prepare("INSERT OR IGNORE INTO schema_version(version) VALUES (?)").run(version);
                continue;
            }
            throw e;
        }
    }
}

function openDb() {
    const path = resolveDbPath();
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    return db;
}

function hashOf(s) {
    return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/**
 * Canonical identity hash — MUST match extract.mjs (collapse whitespace + lowercase,
 * then sha256/16). The importer recomputes it from `original` and ignores any
 * caller-supplied `hash`, so a crafted analyzed.json can't target an arbitrary row.
 */
function keyOf(original) {
    return hashOf(original.replace(/\s+/g, " ").trim().toLowerCase());
}

/** Accept only ISO-8601 date strings; anything else is untrusted and dropped. */
function isIsoDate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s));
}

function clampScore(v) {
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, Math.round(v)));
}

/** Only "typed" is trusted; anything else (incl. missing) is "legacy". */
function provenanceOf(v) {
    return v === "typed" ? "typed" : "legacy";
}

/** Upsert analyzed cheats. NEVER writes favorite / favorited_at — the web owns those. */
function importCheats(cheats, db) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO cheats
          (prompt_hash, original, improved, intent, tags, reuse_score, project,
           occurrences, provenance, first_seen_at, last_seen_at, created_at, updated_at)
        VALUES
          (@prompt_hash, @original, @improved, @intent, @tags, @reuse_score, @project,
           @occurrences, @provenance, @first_seen_at, @last_seen_at, @now, @now)
        ON CONFLICT(prompt_hash) DO UPDATE SET
          original      = excluded.original,
          improved      = excluded.improved,
          intent        = excluded.intent,
          tags          = excluded.tags,
          reuse_score   = excluded.reuse_score,
          project       = excluded.project,
          occurrences   = excluded.occurrences,
          provenance    = CASE WHEN cheats.provenance = 'typed' THEN 'typed' ELSE excluded.provenance END,
          first_seen_at = excluded.first_seen_at,
          last_seen_at  = excluded.last_seen_at,
          updated_at    = excluded.updated_at
    `);
    let imported = 0;
    let skipped = 0;
    const tx = db.transaction((rows) => {
        for (const c of rows) {
            if (!c || typeof c.original !== "string" || !c.original.trim()) {
                skipped++;
                continue;
            }
            const original = c.original;
            stmt.run({
                prompt_hash: keyOf(original),
                original,
                improved: typeof c.improved === "string" ? c.improved : null,
                intent: typeof c.intent === "string" ? c.intent : null,
                tags: JSON.stringify(Array.isArray(c.tags) ? c.tags.filter((t) => typeof t === "string") : []),
                reuse_score: clampScore(c.reuseScore),
                project: typeof c.project === "string" ? c.project : null,
                occurrences: Number.isFinite(c.occurrences) ? Math.max(1, Math.round(c.occurrences)) : 1,
                provenance: provenanceOf(c.provenance),
                first_seen_at: isIsoDate(c.firstSeenAt) ? c.firstSeenAt : now,
                last_seen_at: isIsoDate(c.lastSeenAt) ? c.lastSeenAt : now,
                now,
            });
            imported++;
        }
    });
    tx(cheats);
    return { imported, skipped };
}

function assert(cond, msg) {
    if (!cond) throw new Error(`FAIL: ${msg}`);
}

function selftest() {
    const tmp = join(homedir(), ".skills-lector", `cheats-selftest-${process.pid}.db`);
    process.env.SKILLS_LECTOR_PRESETS_DB = tmp;
    let db;
    try {
        db = openDb();

        // identity key is derived from `original`, NOT the caller-supplied hash
        const k1 = keyOf("do X");

        // 1. first import (no provenance → defaults to legacy); bogus hash is ignored
        let res = importCheats(
            [{ hash: "attacker-row", original: "do X", improved: "please do X", intent: "task", tags: ["a"], reuseScore: 70, occurrences: 2 }],
            db,
        );
        assert(res.imported === 1, "first import should insert 1");
        assert(!db.prepare("SELECT 1 FROM cheats WHERE prompt_hash = ?").get("attacker-row"), "caller-supplied hash MUST be ignored");
        assert(db.prepare("SELECT provenance FROM cheats WHERE prompt_hash = ?").get(k1).provenance === "legacy", "missing provenance defaults to legacy");

        // 2. user favorites it (simulating the web write)
        db.prepare("UPDATE cheats SET favorite = 1, favorited_at = ? WHERE prompt_hash = ?").run(new Date().toISOString(), k1);

        // 3. re-import with changed analysis (now proven typed)
        importCheats(
            [{ original: "do X", improved: "kindly do X", intent: "task", tags: ["a", "b"], reuseScore: 90, occurrences: 5, provenance: "typed" }],
            db,
        );

        const row = db.prepare("SELECT * FROM cheats WHERE prompt_hash = ?").get(k1);
        assert(row.improved === "kindly do X", "analysis column should update on re-import");
        assert(row.occurrences === 5, "occurrences should update on re-import");
        assert(JSON.parse(row.tags).length === 2, "tags should update on re-import");
        assert(row.provenance === "typed", "provenance should update on re-import");
        assert(row.favorite === 1, "favorite MUST be preserved across re-import");
        assert(row.favorited_at, "favorited_at MUST be preserved across re-import");

        // 4. once typed, a later legacy sighting must NOT downgrade the row
        importCheats(
            [{ original: "do X", improved: "kindly do X", intent: "task", tags: ["a", "b"], reuseScore: 90, occurrences: 5, provenance: "legacy" }],
            db,
        );
        assert(db.prepare("SELECT provenance FROM cheats WHERE prompt_hash = ?").get(k1).provenance === "typed", "typed provenance MUST NOT downgrade to legacy on re-import");

        // 5. malformed dates are rejected, blank/null rows skipped
        importCheats([{ original: "ts probe", firstSeenAt: "ZZZZ", lastSeenAt: "2026-01-02T03:04:05.000Z" }], db);
        const tsRow = db.prepare("SELECT first_seen_at, last_seen_at FROM cheats WHERE prompt_hash = ?").get(keyOf("ts probe"));
        assert(/^\d{4}-\d{2}-\d{2}T/.test(tsRow.first_seen_at), "malformed firstSeenAt must fall back to an ISO timestamp");
        assert(tsRow.last_seen_at === "2026-01-02T03:04:05.000Z", "valid ISO lastSeenAt must be preserved");

        res = importCheats([{ original: "" }, null, { original: "valid new one" }], db);
        assert(res.skipped === 2, "blank/null rows should be skipped");
        assert(res.imported === 1, "the one valid row should import");

        // 6. known-hashes dump reflects the stored rows (feeds extract --only-new)
        const tmpHashes = join(homedir(), ".skills-lector", `cheats-hashes-${process.pid}.json`);
        const n = writeKnownHashes(db, tmpHashes);
        assert(n >= 1, "writeKnownHashes should dump at least one hash");
        const dumped = JSON.parse(readFileSync(tmpHashes, "utf8"));
        assert(Array.isArray(dumped), "known-hashes file is a JSON array");
        assert(dumped.includes(k1), "dumped hashes include the known row");
        assert(dumped.includes(keyOf("valid new one")), "dumped hashes include a freshly imported row");
        rmSync(tmpHashes, { force: true });

        console.log("OK import-cheats selftest");
    } finally {
        if (db) {
            try {
                db.close();
            } catch {
                /* already closed */
            }
        }
        for (const suffix of ["", "-wal", "-shm"]) rmSync(tmp + suffix, { force: true });
    }
}

function main() {
    const arg = process.argv[2];
    if (arg === "selftest") return selftest();

    // `known-hashes [outfile]` — dump the library's hashes for extract --only-new.
    // Use this once to seed only-new mode against a pre-existing DB.
    if (arg === "known-hashes") {
        const outPath = knownHashesPath(process.argv[3]);
        let db;
        try {
            db = openDb();
            const n = writeKnownHashes(db, outPath);
            console.log(`[cheats] wrote ${n} known hash(es) → ${outPath}`);
        } catch (e) {
            console.error(`[cheats] fatal: ${e instanceof Error ? e.message : String(e)}`);
            process.exitCode = 1;
        } finally {
            if (db) {
                try {
                    db.close();
                } catch {
                    /* already closed */
                }
            }
        }
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
    let db;
    try {
        db = openDb();
        const { imported, skipped } = importCheats(cheats, db);
        console.log(`[cheats] imported ${imported}, skipped ${skipped} → ${resolveDbPath()}`);
        // Refresh the only-new hash set so the next extract skips everything now stored.
        try {
            const kp = knownHashesPath();
            const n = writeKnownHashes(db, kp);
            console.log(`[cheats] refreshed ${n} known hash(es) → ${kp} (next extract skips these unless --full)`);
        } catch (e) {
            console.error(`[cheats] warning: could not write known-hashes (${e instanceof Error ? e.message : String(e)}); next extract will run full`);
        }
    } catch (e) {
        console.error(`[cheats] fatal: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
    } finally {
        if (db) {
            try {
                db.close();
            } catch {
                /* already closed */
            }
        }
    }
}

try {
    main();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
}
