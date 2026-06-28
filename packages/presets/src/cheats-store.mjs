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
