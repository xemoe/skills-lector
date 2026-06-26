// packages/presets/src/db.ts
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    "migrations",
);

// Cache the connection on globalThis, not a module-level `let`. In `next dev`
// (Turbopack) each API route is evaluated as its own module instance, so a
// module-level cache gives every route a *separate* better-sqlite3 connection —
// a write committed on one route's connection is invisible to another's, making
// list/detail/mutation routes disagree. A process-wide globalThis singleton (the
// standard Next.js dev pattern) keeps them on one connection. Prod already runs a
// single bundled instance, so this only changes dev.
const globalForDb = globalThis as unknown as {
    __lectorDb?: Database.Database;
    __lectorDbPath?: string;
};

function resolveDbPath(): string {
    const fromEnv = process.env.SKILLS_LECTOR_PRESETS_DB;
    if (fromEnv && fromEnv.trim()) return expandHome(fromEnv.trim());
    return join(homedir(), ".skills-lector", "presets.db");
}

function expandHome(p: string): string {
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) {
        return join(homedir(), p.slice(2));
    }
    return p;
}

function loadMigrations(): Array<{ version: number; sql: string; file: string }> {
    if (!existsSync(MIGRATIONS_DIR)) return [];
    const entries = readdirSync(MIGRATIONS_DIR)
        .filter((f) => /^\d{3}_.*\.sql$/.test(f))
        .sort();
    return entries.map((file) => {
        const version = Number(file.slice(0, 3));
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        return { version, sql, file };
    });
}

function currentVersion(db: Database.Database): number {
    try {
        const row = db
            .prepare("SELECT MAX(version) AS v FROM schema_version")
            .get() as { v: number | null } | undefined;
        return row?.v ?? 0;
    } catch {
        return 0; // schema_version table does not exist yet
    }
}

function runMigrations(db: Database.Database): void {
    const migrations = loadMigrations();
    const current = currentVersion(db);
    for (const m of migrations) {
        if (m.version <= current) continue;
        db.exec("BEGIN");
        try {
            db.exec(m.sql);
            db.exec("COMMIT");
        } catch (err) {
            db.exec("ROLLBACK");
            const msg = err instanceof Error ? err.message : String(err);
            // ponytail: SQLite has no `ADD COLUMN IF NOT EXISTS`, so a migration replayed
            // out-of-band (copied DB, hand-edited schema_version) throws a benign
            // "duplicate column"/"already exists". The schema is already in the target
            // state — treat as applied and converge. Real failures still throw.
            if (/duplicate column name|already exists/i.test(msg)) {
                db.prepare("INSERT OR IGNORE INTO schema_version(version) VALUES (?)").run(m.version);
                continue;
            }
            throw new Error(`Migration ${m.file} failed: ${msg}`);
        }
    }
}

export function openDb(): Database.Database {
    const path = resolveDbPath();
    if (globalForDb.__lectorDb && globalForDb.__lectorDbPath === path) {
        return globalForDb.__lectorDb;
    }
    if (globalForDb.__lectorDb) {
        globalForDb.__lectorDb.close();
        globalForDb.__lectorDb = undefined;
    }
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    globalForDb.__lectorDb = db;
    globalForDb.__lectorDbPath = path;
    return db;
}

export function closeDb(): void {
    if (globalForDb.__lectorDb) {
        globalForDb.__lectorDb.close();
        globalForDb.__lectorDb = undefined;
        globalForDb.__lectorDbPath = undefined;
    }
}

export function getDbPath(): string {
    return resolveDbPath();
}
