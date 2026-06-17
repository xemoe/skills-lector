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

function clampScore(v) {
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, Math.round(v)));
}

/** Upsert analyzed cheats. NEVER writes favorite / favorited_at — the web owns those. */
function importCheats(cheats, db) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO cheats
          (prompt_hash, original, improved, intent, tags, reuse_score, project,
           occurrences, first_seen_at, last_seen_at, created_at, updated_at)
        VALUES
          (@prompt_hash, @original, @improved, @intent, @tags, @reuse_score, @project,
           @occurrences, @first_seen_at, @last_seen_at, @now, @now)
        ON CONFLICT(prompt_hash) DO UPDATE SET
          original      = excluded.original,
          improved      = excluded.improved,
          intent        = excluded.intent,
          tags          = excluded.tags,
          reuse_score   = excluded.reuse_score,
          project       = excluded.project,
          occurrences   = excluded.occurrences,
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
                prompt_hash:
                    typeof c.hash === "string" && c.hash ? c.hash : hashOf(original.trim()),
                original,
                improved: typeof c.improved === "string" ? c.improved : null,
                intent: typeof c.intent === "string" ? c.intent : null,
                tags: JSON.stringify(Array.isArray(c.tags) ? c.tags.filter((t) => typeof t === "string") : []),
                reuse_score: clampScore(c.reuseScore),
                project: typeof c.project === "string" ? c.project : null,
                occurrences: Number.isFinite(c.occurrences) ? Math.max(1, Math.round(c.occurrences)) : 1,
                first_seen_at: typeof c.firstSeenAt === "string" ? c.firstSeenAt : now,
                last_seen_at: typeof c.lastSeenAt === "string" ? c.lastSeenAt : now,
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

        // 1. first import
        let res = importCheats(
            [{ hash: "h1", original: "do X", improved: "please do X", intent: "task", tags: ["a"], reuseScore: 70, occurrences: 2 }],
            db,
        );
        assert(res.imported === 1, "first import should insert 1");

        // 2. user favorites it (simulating the web write)
        db.prepare("UPDATE cheats SET favorite = 1, favorited_at = ? WHERE prompt_hash = 'h1'").run(new Date().toISOString());

        // 3. re-import with changed analysis
        importCheats(
            [{ hash: "h1", original: "do X", improved: "kindly do X", intent: "task", tags: ["a", "b"], reuseScore: 90, occurrences: 5 }],
            db,
        );

        const row = db.prepare("SELECT * FROM cheats WHERE prompt_hash = 'h1'").get();
        assert(row.improved === "kindly do X", "analysis column should update on re-import");
        assert(row.occurrences === 5, "occurrences should update on re-import");
        assert(JSON.parse(row.tags).length === 2, "tags should update on re-import");
        assert(row.favorite === 1, "favorite MUST be preserved across re-import");
        assert(row.favorited_at, "favorited_at MUST be preserved across re-import");

        // 4. malformed row is skipped, not fatal
        res = importCheats([{ original: "" }, null, { original: "valid new one" }], db);
        assert(res.skipped === 2, "blank/null rows should be skipped");
        assert(res.imported === 1, "the one valid row should import");

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
