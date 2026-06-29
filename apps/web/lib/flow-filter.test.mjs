// Self-contained node assert tests for the project dimension of flow-filter.ts.
//
// Run with:
//   node --experimental-strip-types apps/web/lib/flow-filter.test.mjs
//
// Requires Node 22+ (--experimental-strip-types removes TypeScript syntax at
// load time with no compilation step).

import assert from "node:assert/strict";
import {
    parseFlowFilters,
    buildFlowQuery,
    cheatProjectMap,
    flowProjects,
    filterSortFlows,
} from "./flow-filter.ts";

// ---- fixtures ----------------------------------------------------------------

const cheat = (id, project) => ({ id, project });
// cheats 1,2 → /api ; cheat 3 → /web ; cheat 4 → null project
const cheats = [cheat(1, "/api"), cheat(2, "/api"), cheat(3, "/web"), cheat(4, null)];
const map = cheatProjectMap(cheats);

const flow = (id, steps) => ({
    id,
    slug: `f${id}`,
    name: `Flow ${id}`,
    description: null,
    steps,
    seeded: false,
    enhanced: null,
    createdAt: "2024-01-0" + id + "T00:00:00.000Z",
    updatedAt: "2024-01-0" + id + "T00:00:00.000Z",
});

const mixed = flow(1, [1, 2, 3]); // /api AND /web
const apiOnly = flow(2, [1, 2]); // /api
const orphan = flow(3, [4]); // no project (null) + unknown ids

// ---- cheatProjectMap ---------------------------------------------------------

assert.equal(map.get(1), "/api");
assert.equal(map.get(4), null, "null project preserved in map");
assert.equal(map.get(99), undefined, "unknown id → undefined");

// ---- flowProjects ------------------------------------------------------------

assert.deepEqual(
    [...flowProjects(mixed, map)].sort(),
    ["/api", "/web"],
    "mixed flow exposes both projects",
);
assert.deepEqual([...flowProjects(orphan, map)], [], "null/unknown step ids yield no project");

// ---- filterSortFlows: any-step rule -----------------------------------------

const all = [mixed, apiOnly, orphan];
const base = { query: "", sort: "recent" };

const api = filterSortFlows(all, { ...base, project: "/api" }, map);
assert.deepEqual(api.map((f) => f.id).sort(), [1, 2], "/api matches mixed + apiOnly");

const web = filterSortFlows(all, { ...base, project: "/web" }, map);
assert.deepEqual(web.map((f) => f.id), [1], "/web matches only the mixed flow");

const none = filterSortFlows(all, { ...base, project: "/nope" }, map);
assert.equal(none.length, 0, "unrelated project matches nothing");

const allProjects = filterSortFlows(all, { ...base, project: "all" }, map);
assert.equal(allProjects.length, 3, "'all' keeps every flow");

// project filter composes with search
const apiSearch = filterSortFlows(all, { query: "flow 2", sort: "recent", project: "/api" }, map);
assert.deepEqual(apiSearch.map((f) => f.id), [2], "project + search both applied");

// ---- parse / build round-trip incl. project ---------------------------------

const sp = new URLSearchParams("q=foo&project=%2Fapi&sort=name");
const parsed = parseFlowFilters(sp);
assert.deepEqual(parsed, { query: "foo", project: "/api", sort: "name" });

// empty `?project=` must collapse to "all", not "" (which would filter out all flows)
assert.equal(parseFlowFilters(new URLSearchParams("project=")).project, "all");

assert.equal(
    buildFlowQuery({ query: "foo", project: "/api", sort: "name" }),
    "q=foo&project=%2Fapi&sort=name",
);
// "all" is the default and must be omitted from the query string
assert.equal(buildFlowQuery({ query: "", project: "all", sort: "recent" }), "");
assert.equal(buildFlowQuery({ query: "", project: "/api", sort: "recent" }), "project=%2Fapi");

console.log("flow-filter: all assertions passed ✓");
