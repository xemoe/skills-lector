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
        id: Number.isInteger(d.id) ? d.id : 0,
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
    } catch (e) {
        console.error(`[flows] failed to parse ${path}: ${e instanceof Error ? e.message : String(e)}`);
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
