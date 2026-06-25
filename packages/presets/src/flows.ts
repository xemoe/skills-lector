// packages/presets/src/flows.ts
// Read + write module for Flows — ordered cheat sequences for a kind of work.
// Mirrors the shape of cheats.ts (rowTo*, parseSteps, COLS) and the collision
// handling of presets.ts (SlugCollisionError, requireFlow).
import { openDb } from "./db";
import { nowIso } from "./util";
import { listCheats } from "./cheats";
import type { Flow } from "./types";

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

type DbFlowRow = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    steps: string;
    seeded: number;
    created_at: string;
    updated_at: string;
};

// ---------------------------------------------------------------------------
// Helpers — mirror cheats.ts conventions
// ---------------------------------------------------------------------------

function parseSteps(raw: string | null): number[] {
    if (!raw) return [];
    try {
        const v: unknown = JSON.parse(raw);
        return Array.isArray(v)
            ? v.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
            : [];
    } catch {
        return [];
    }
}

function rowToFlow(r: DbFlowRow): Flow {
    return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        steps: parseSteps(r.steps),
        seeded: r.seeded === 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

const COLS = "id, slug, name, description, steps, seeded, created_at, updated_at";

// ---------------------------------------------------------------------------
// Slug collision error — mirrors presets.ts
// ---------------------------------------------------------------------------

export class SlugCollisionError extends Error {
    constructor(slug: string) {
        super(`Flow slug already exists: ${slug}`);
        this.name = "SlugCollisionError";
    }
}

// ---------------------------------------------------------------------------
// Internal guard — throws if flow id is unknown
// ---------------------------------------------------------------------------

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
    const db = openDb();
    const rows = db
        .prepare(`SELECT ${COLS} FROM flows ORDER BY updated_at DESC`)
        .all() as DbFlowRow[];
    return rows.map(rowToFlow);
}

/** Single flow by numeric id, or null if not found. */
export function getFlow(id: number): Flow | null {
    const db = openDb();
    const row = db
        .prepare(`SELECT ${COLS} FROM flows WHERE id = ?`)
        .get(id) as DbFlowRow | undefined;
    return row ? rowToFlow(row) : null;
}

/** Single flow by slug, or null if not found. */
export function getFlowBySlug(slug: string): Flow | null {
    const db = openDb();
    const row = db
        .prepare(`SELECT ${COLS} FROM flows WHERE slug = ?`)
        .get(slug) as DbFlowRow | undefined;
    return row ? rowToFlow(row) : null;
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
    const db = openDb();
    const existing = getFlowBySlug(input.slug);
    if (existing) throw new SlugCollisionError(input.slug);
    const ts = nowIso();
    const info = db
        .prepare(
            `INSERT INTO flows (slug, name, description, steps, seeded, created_at, updated_at)
             VALUES (?, ?, ?, '[]', 0, ?, ?)`,
        )
        .run(input.slug, input.name, input.description ?? null, ts, ts);
    const created = getFlow(Number(info.lastInsertRowid));
    if (!created) throw new Error("Failed to load created flow");
    return created;
}

export type UpdateFlowInput = {
    name?: string;
    description?: string | null;
};

/** Updates name and/or description of a flow. Throws if id is unknown. */
export function updateFlow(id: number, input: UpdateFlowInput): Flow {
    const db = openDb();
    const current = requireFlow(id);
    const next = {
        name: input.name ?? current.name,
        description: input.description === undefined ? current.description : input.description,
        updated_at: nowIso(),
    };
    db.prepare(
        `UPDATE flows SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
    ).run(next.name, next.description, next.updated_at, id);
    return getFlow(id)!;
}

/** Replaces the ordered step list for a flow. Throws if id is unknown. */
export function setFlowSteps(id: number, cheatIds: number[]): Flow {
    const db = openDb();
    requireFlow(id);
    const ts = nowIso();
    db.prepare(
        `UPDATE flows SET steps = ?, updated_at = ? WHERE id = ?`,
    ).run(JSON.stringify(cheatIds), ts, id);
    return getFlow(id)!;
}

/** Permanently deletes a flow. */
export function deleteFlow(id: number): void {
    const db = openDb();
    db.prepare(`DELETE FROM flows WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export type SeedResult = { created: Flow[] };

/**
 * Auto-seed starter flows from existing cheats.
 *
 * Algorithm:
 * 1. Read all cheats.
 * 2. Group by intent (skip null/empty).
 * 3. Keep groups with >= 2 cheats.
 * 4. For each group: derive slug from intent; skip if a flow with that slug
 *    already exists (idempotent). Steps = cheat ids sorted by reuseScore desc,
 *    then occurrences desc. seeded = 1.
 * 5. Return { created }.
 */
export function seedFlows(): SeedResult {
    const cheats = listCheats();
    const byIntent = new Map<string, typeof cheats>();

    for (const cheat of cheats) {
        if (!cheat.intent || !cheat.intent.trim()) continue;
        const key = cheat.intent.trim();
        const group = byIntent.get(key);
        if (group) {
            group.push(cheat);
        } else {
            byIntent.set(key, [cheat]);
        }
    }

    const created: Flow[] = [];

    for (const [intent, group] of byIntent) {
        if (group.length < 2) continue;

        const slug = toFlowSlug(intent);
        if (getFlowBySlug(slug)) continue; // already exists — skip (idempotent)

        const sorted = [...group].sort((a, b) => {
            const scoreA = a.reuseScore ?? -Infinity;
            const scoreB = b.reuseScore ?? -Infinity;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return b.occurrences - a.occurrences;
        });

        const cheatIds = sorted.map((c) => c.id);
        const ts = nowIso();
        const db = openDb();
        const info = db
            .prepare(
                `INSERT INTO flows (slug, name, description, steps, seeded, created_at, updated_at)
                 VALUES (?, ?, NULL, ?, 1, ?, ?)`,
            )
            .run(slug, intent, JSON.stringify(cheatIds), ts, ts);
        const flow = getFlow(Number(info.lastInsertRowid));
        if (flow) created.push(flow);
    }

    return { created };
}

// ---------------------------------------------------------------------------
// Internal: kebab-case slug from intent string
// ---------------------------------------------------------------------------

/**
 * Converts an intent string to a URL-safe kebab slug.
 * - Lowercase.
 * - Non-alphanumeric characters → `-`.
 * - Consecutive `-` collapsed to one.
 * - Leading/trailing `-` trimmed.
 * - For an intent with no alphanumerics, falls back to `flow-<hash>` — a stable
 *   per-intent suffix so two distinct symbol-only intents don't collide on a bare
 *   `"flow"` (and re-seeding reproduces the same slug, keeping seedFlows idempotent).
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
