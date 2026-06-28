#!/usr/bin/env node
// Writer for mined Flows: upserts each flow's step prompts as cheats (via the
// shared cheats-store, which returns their numeric ids) then writes the flow JSON
// (via the shared flows-store). Mirrors import-cheats.mjs and demonstrates flows
// are writable offline from a plain .mjs (no server). Run:
//   node packages/presets/scripts/import-flows.mjs <flows-spec.json> [--force]
//   node packages/presets/scripts/import-flows.mjs selftest
import { readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    upsertByHash, readCheat, writeCheatAtomic,
} from "../src/cheats-store.mjs";
import {
    readFlowBySlug, nextFlowId, writeFlowAtomic, listFlowFiles,
} from "../src/flows-store.mjs";

/**
 * Import mined flows. Each step is a cheat-shaped object (must have `original`);
 * it is upserted by hash (favorite/id preserved) and its id becomes the flow step.
 * A flow whose slug already exists is skipped unless `force` (then rewritten,
 * keeping its id/createdAt). Returns counts.
 */
export function importFlows(spec, { force = false } = {}) {
    const now = new Date().toISOString();
    const flows = Array.isArray(spec?.flows) ? spec.flows : [];
    let flowsWritten = 0;
    let flowsSkipped = 0;
    let cheatsUpserted = 0;
    for (const f of flows) {
        if (!f || typeof f.slug !== "string" || !f.slug.trim()) continue;
        const steps = Array.isArray(f.steps) ? f.steps : [];
        const ids = [];
        for (const s of steps) {
            const c = upsertByHash(s, now); // recomputes hash from original; preserves favorite/id
            if (c) {
                ids.push(c.id);
                cheatsUpserted++;
            }
        }
        const existing = readFlowBySlug(f.slug);
        if (existing && !force) {
            flowsSkipped++;
            continue;
        }
        writeFlowAtomic({
            id: existing ? existing.id : nextFlowId(),
            slug: f.slug,
            name: typeof f.name === "string" ? f.name : f.slug,
            description: typeof f.description === "string" ? f.description : null,
            steps: ids,
            seeded: true,
            enhanced: existing ? existing.enhanced : null,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
        });
        flowsWritten++;
    }
    return { flowsWritten, flowsSkipped, cheatsUpserted };
}

function assert(cond, msg) {
    if (!cond) throw new Error(`FAIL: ${msg}`);
}

function selftest() {
    const tmp = join(homedir(), ".skills-lector", `flows-selftest-${process.pid}`);
    process.env.SKILLS_LECTOR_STORE = tmp;
    try {
        const spec = {
            flows: [
                {
                    slug: "t-debug",
                    name: "T debug",
                    steps: [
                        { original: "fix the auth bug", improved: "Fix the auth bug", intent: "debugging", tags: ["auth"], reuseScore: 60, provenance: "typed" },
                        { original: "add a regression test", improved: "Add a regression test", intent: "testing", tags: ["test"], reuseScore: 55, provenance: "typed" },
                    ],
                },
                {
                    slug: "t-ship",
                    name: "T ship",
                    steps: [
                        { original: "commit and open a PR", improved: "Commit and open a PR", intent: "feature", tags: ["git"], reuseScore: 70, provenance: "typed" },
                    ],
                },
            ],
        };

        let r = importFlows(spec);
        assert(r.flowsWritten === 2, "2 flows written");
        assert(r.cheatsUpserted === 3, "3 step cheats upserted");
        const debug = readFlowBySlug("t-debug");
        assert(debug && debug.steps.length === 2, "t-debug has 2 steps");
        assert(debug.steps.every((n) => Number.isInteger(n)), "steps are numeric cheat ids");
        for (const id of debug.steps) assert(readCheat(id), `step cheat ${id} exists`);

        // favorite a step cheat (web write), re-run: must survive + flow idempotent
        const first = readCheat(debug.steps[0]);
        writeCheatAtomic({ ...first, favorite: true, favoritedAt: new Date().toISOString() });
        r = importFlows(spec);
        assert(r.flowsSkipped === 2, "re-run skips existing flows (idempotent)");
        assert(readCheat(debug.steps[0]).favorite === true, "favorite on step cheat preserved across re-run");
        assert(listFlowFiles().flows.length === 2, "no duplicate flows created");

        // --force rewrites flows without changing their id
        const beforeId = readFlowBySlug("t-debug").id;
        r = importFlows(spec, { force: true });
        assert(r.flowsWritten === 2, "force rewrites flows");
        assert(readFlowBySlug("t-debug").id === beforeId, "force preserves flow id");

        console.log("OK import-flows selftest");
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function main() {
    const arg = process.argv[2];
    if (arg === "selftest") return selftest();
    const force = process.argv.includes("--force");
    if (!arg) {
        console.error("[flows] usage: import-flows.mjs <flows-spec.json> [--force]");
        process.exit(1);
    }
    let spec;
    try {
        spec = JSON.parse(readFileSync(arg, "utf8"));
    } catch (e) {
        console.error(`[flows] invalid JSON in ${arg}: ${e.message}`);
        process.exit(1);
    }
    const { flowsWritten, flowsSkipped, cheatsUpserted } = importFlows(spec, { force });
    console.log(`[flows] wrote ${flowsWritten} flow(s), skipped ${flowsSkipped} existing, upserted ${cheatsUpserted} step cheat(s)`);
}

try {
    main();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
}
