// packages/presets/src/cheats.ts
// Read side of the Cheats feature + the single favorite mutation. The bulk
// upsert lives in scripts/import-cheats.mjs (the generator's writer); this module
// is what the Next.js app imports.
import { openDb } from "./db";
import type { Cheat, CheatProvenance } from "./types";

type DbCheatRow = {
    id: number;
    prompt_hash: string;
    original: string;
    improved: string | null;
    intent: string | null;
    tags: string;
    reuse_score: number | null;
    project: string | null;
    occurrences: number;
    provenance: string;
    favorite: number;
    favorited_at: string | null;
    first_seen_at: string;
    last_seen_at: string;
    created_at: string;
    updated_at: string;
};

// provenance is `TEXT NOT NULL DEFAULT 'legacy'` (migration 003) — never null from the DB.
function toProvenance(raw: string): CheatProvenance {
    return raw === "typed" ? "typed" : "legacy";
}

function parseTags(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const v: unknown = JSON.parse(raw);
        return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
    } catch {
        return [];
    }
}

function rowToCheat(r: DbCheatRow): Cheat {
    return {
        id: r.id,
        promptHash: r.prompt_hash,
        original: r.original,
        improved: r.improved,
        intent: r.intent,
        tags: parseTags(r.tags),
        reuseScore: r.reuse_score,
        project: r.project,
        occurrences: r.occurrences,
        provenance: toProvenance(r.provenance),
        favorite: r.favorite === 1,
        favoritedAt: r.favorited_at,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

const COLS =
    "id, prompt_hash, original, improved, intent, tags, reuse_score, project, occurrences, provenance, favorite, favorited_at, first_seen_at, last_seen_at, created_at, updated_at";

/** All cheats, favorites first then most-recently-seen. */
export function listCheats(): Cheat[] {
    const db = openDb();
    const rows = db
        .prepare(`SELECT ${COLS} FROM cheats ORDER BY favorite DESC, last_seen_at DESC`)
        .all() as DbCheatRow[];
    return rows.map(rowToCheat);
}

/** Returns a single cheat by numeric id, or null if not found. */
export function getCheat(id: number): Cheat | null {
    const db = openDb();
    const row = db.prepare(`SELECT ${COLS} FROM cheats WHERE id = ?`).get(id) as
        | DbCheatRow
        | undefined;
    return row ? rowToCheat(row) : null;
}

/** Toggle a favorite. Returns the updated cheat, or null if the id is unknown. */
export function setFavorite(id: number, on: boolean): Cheat | null {
    const db = openDb();
    const now = new Date().toISOString();
    const info = db
        .prepare("UPDATE cheats SET favorite = ?, favorited_at = ? WHERE id = ?")
        .run(on ? 1 : 0, on ? now : null, id);
    if (info.changes === 0) return null;
    return getCheat(id);
}
