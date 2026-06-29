// Integration self-check for seedFlows({ project }).
//
// Run with:
//   node --experimental-strip-types packages/presets/src/flows-seed.test.mjs
//
// Points the file-backed store at a throwaway temp dir, writes a handful of
// cheats across two projects, and asserts that project-scoped seeding groups
// only that project's cheats, namespaces slug + name by basename, and is
// idempotent on re-run.

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.SKILLS_LECTOR_STORE = mkdtempSync(join(tmpdir(), "lector-seed-test-"));

const { upsertMany } = await import("./cheats-store.mjs");
const { seedFlows, seededSlug, seededName } = await import("./flows.ts");

// ---- pure naming helpers -----------------------------------------------------

const apiSlug = seededSlug("debugging", "/Users/me/api");
assert.ok(apiSlug.startsWith("api-") && apiSlug.endsWith("-debugging"), "slug namespaced by basename");
assert.notEqual(apiSlug, "api-debugging", "slug carries a path hash, not just basename");
assert.equal(seededName("debugging", "/Users/me/api"), "api · debugging", "name uses bare basename");
assert.equal(seededSlug("debugging"), "debugging", "global slug unchanged");
assert.equal(seededName("debugging"), "debugging", "global name unchanged");

// Same basename, different paths → distinct, stable slugs (the collision fix).
assert.notEqual(
    seededSlug("debugging", "/a/api"),
    seededSlug("debugging", "/b/api"),
    "two repos sharing a basename get different slugs",
);
assert.equal(
    seededSlug("debugging", "/a/api"),
    seededSlug("debugging", "/a/api"),
    "slug is deterministic for the same path (idempotent)",
);

// ---- fixtures: debugging cheats in two same-basename repos + /web -------------

const API = "/Users/me/api";
const API2 = "/Other/api"; // same basename "api", different path
const WEB = "/Users/me/web";
const now = "2026-06-29T00:00:00.000Z";

const { cheats } = upsertMany(
    [
        { original: "api debug one", intent: "debugging", project: API, reuseScore: 90, occurrences: 5 },
        { original: "api debug two", intent: "debugging", project: API, reuseScore: 80, occurrences: 3 },
        { original: "other-api debug one", intent: "debugging", project: API2, reuseScore: 75, occurrences: 4 },
        { original: "other-api debug two", intent: "debugging", project: API2, reuseScore: 65, occurrences: 2 },
        { original: "web debug one", intent: "debugging", project: WEB, reuseScore: 70, occurrences: 2 },
        { original: "web debug two", intent: "debugging", project: WEB, reuseScore: 60, occurrences: 1 },
        { original: "api refactor lone", intent: "refactor", project: API, reuseScore: 50, occurrences: 1 },
    ],
    now,
);
const idOf = (text) => cheats.find((c) => c.original === text).id;

// ---- scoped seed: /api only --------------------------------------------------

const scoped = seedFlows({ project: API });
assert.equal(scoped.created.length, 1, "one flow for /api (debugging group of 2); lone refactor skipped");

const flow = scoped.created[0];
assert.ok(flow.slug.startsWith("api-") && flow.slug.endsWith("-debugging"), "slug namespaced by basename");
assert.equal(flow.name, "api · debugging", "name prefixed by basename");
assert.equal(flow.seeded, true);
assert.deepEqual(
    [...flow.steps].sort((a, b) => a - b),
    [idOf("api debug one"), idOf("api debug two")].sort((a, b) => a - b),
    "steps contain only /api cheats — no /web or /Other/api bleed",
);

// ---- idempotent re-run -------------------------------------------------------

const again = seedFlows({ project: API });
assert.equal(again.created.length, 0, "re-seeding /api creates nothing (slug exists)");

// ---- same-basename sibling seeds independently (collision fix) ---------------

const other = seedFlows({ project: API2 });
assert.equal(other.created.length, 1, "/Other/api seeds despite sharing basename 'api'");
assert.notEqual(other.created[0].slug, flow.slug, "sibling repo gets a distinct slug");
assert.deepEqual(
    [...other.created[0].steps].sort((a, b) => a - b),
    [idOf("other-api debug one"), idOf("other-api debug two")].sort((a, b) => a - b),
    "sibling flow contains only its own repo's cheats",
);

// ---- a different project seeds independently ---------------------------------

const web = seedFlows({ project: WEB });
assert.equal(web.created.length, 1, "/web seeds its own flow");
assert.ok(web.created[0].slug.startsWith("web-"), "web slug namespaced by basename");

console.log("flows-seed: all assertions passed ✓");
