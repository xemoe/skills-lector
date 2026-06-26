// Self-contained node assert tests for flow-resolve.ts.
//
// Run with:
//   node --experimental-strip-types apps/web/lib/flow-resolve.test.mjs
//
// Requires Node 22+ (--experimental-strip-types removes TypeScript syntax at
// load time with no compilation step).

import assert from "node:assert/strict";
import { resolveSteps, buildCombinedPrompt, cheatsByIdMap } from "./flow-resolve.ts";

// ---- fixtures ----------------------------------------------------------------

/** cheat id=1: has intent + improved prompt */
const cheat1 = {
    id: 1,
    promptHash: "h1",
    original: "Do the research",
    improved: "Perform thorough research and summarise findings",
    intent: "research",
    tags: [],
    reuseScore: 0.9,
    project: null,
    occurrences: 5,
    provenance: "typed",
    favorite: false,
    favoritedAt: null,
    firstSeenAt: "2024-01-01T00:00:00.000Z",
    lastSeenAt: "2024-01-05T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-05T00:00:00.000Z",
};

/** cheat id=3: no intent, no improved prompt */
const cheat3 = {
    id: 3,
    promptHash: "h3",
    original: "Write the code",
    improved: null,
    intent: null,
    tags: [],
    reuseScore: null,
    project: null,
    occurrences: 2,
    provenance: "legacy",
    favorite: false,
    favoritedAt: null,
    firstSeenAt: "2024-01-02T00:00:00.000Z",
    lastSeenAt: "2024-01-04T00:00:00.000Z",
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-04T00:00:00.000Z",
};

/** flow steps [1, 2, 3]: cheat id=2 is missing (removed) */
const flow = {
    id: 10,
    slug: "ship-feature",
    name: "Ship a Feature",
    description: "end-to-end feature workflow",
    steps: [1, 2, 3],
    seeded: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
};

// ---- cheatsByIdMap -----------------------------------------------------------

const map = cheatsByIdMap([cheat1, cheat3]);

assert.equal(map.size, 2, "map should contain exactly 2 entries");
assert.equal(map.get(1), cheat1, "map.get(1) should return cheat1");
assert.equal(map.get(3), cheat3, "map.get(3) should return cheat3");
assert.equal(map.get(2), undefined, "missing cheat should be undefined");

// ---- resolveSteps -----------------------------------------------------------

const resolved = resolveSteps(flow, map);

assert.equal(resolved.length, 3, "should produce one ResolvedStep per flow step id");
assert.deepEqual(resolved[0], { cheatId: 1, cheat: cheat1 }, "step 0: cheat1 present");
assert.deepEqual(resolved[1], { cheatId: 2, cheat: null }, "step 1: removed cheat → null");
assert.deepEqual(resolved[2], { cheatId: 3, cheat: cheat3 }, "step 2: cheat3 present");

// ---- buildCombinedPrompt ----------------------------------------------------

const prompt = buildCombinedPrompt(flow, map);

// Starts with the flow title
assert.ok(
    prompt.startsWith("# Ship a Feature"),
    `expected '# Ship a Feature' title, got: ${prompt.slice(0, 80)}`,
);

// Step 1 — uses improved prompt; intent used in header label
assert.ok(
    prompt.includes("## Step 1 — research"),
    `Step 1 header missing; prompt:\n${prompt}`,
);
assert.ok(
    prompt.includes("Perform thorough research and summarise findings"),
    "Step 1 should use improved prompt, not original",
);

// Removed cheat (id=2) is skipped; cheat3 becomes Step 2 with fallback label
assert.ok(
    prompt.includes("## Step 2 — Step 2"),
    `Step 2 fallback-label header missing; prompt:\n${prompt}`,
);
assert.ok(
    prompt.includes("Write the code"),
    "Step 2 should include cheat3 original (no improved)",
);

// Only two step headers (removed cheat must not contribute one)
const headerCount = (prompt.match(/## Step/g) ?? []).length;
assert.equal(headerCount, 2, `expected exactly 2 '## Step' headers, found ${headerCount}`);

// ---- empty flow -------------------------------------------------------------

const emptyFlow = { ...flow, steps: [] };
const emptyPrompt = buildCombinedPrompt(emptyFlow, map);
assert.equal(emptyPrompt, "# Ship a Feature", "empty flow should produce only the title");

console.log("flow-resolve: all assertions passed ✓");
