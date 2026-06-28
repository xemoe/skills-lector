// packages/presets/src/flows.ts
// Read + write module for Flows — ordered cheat sequences for a kind of work.
// The on-disk format + IO live in flows-store.mjs (one JSON file per slug, shared
// so an offline .mjs generator can write flows too). Signatures are unchanged from
// the previous SQLite implementation; slug is immutable so files never get renamed.
import {
    listFlowFiles, readFlowById, readFlowBySlug, writeFlowAtomic,
    deleteFlowFile, nextFlowId, flowExists,
} from "./flows-store.mjs";
import { listCheatFiles } from "./cheats-store.mjs";
import type { Flow, FlowEnhancedStep, FlowEnhancement, Cheat } from "./types";

// Single source for timestamps within this module.
const nowIso = () => new Date().toISOString();

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
    const cheats = listCheatFiles().cheats as Cheat[];
    const byIntent = new Map<string, Cheat[]>();

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
