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
