// Pure, framework-agnostic filter/sort for the Flows catalog. Shared by the
// explorer (list) and the detail-page back/prev/next nav so both derive the
// same ordered list from the same URL params. No React, no next/navigation —
// the only input is a minimal `{ get }` params object.

import type { Cheat, Flow } from "@lector/presets/types";

export type FlowSortKey = "recent" | "name" | "steps";

export interface FlowFilters {
    query: string;
    project: string; // "all" or a project path
    sort: FlowSortKey;
}

/** Anything URLSearchParams-like (covers Next's ReadonlyURLSearchParams). */
type ParamsLike = { get(name: string): string | null };

/** Parse URL params into a fully-defaulted filter object. */
export function parseFlowFilters(sp: ParamsLike): FlowFilters {
    const sort = sp.get("sort");
    return {
        query: sp.get("q") ?? "",
        project: sp.get("project") || "all", // empty `?project=` → all, not "" (filters out everything)
        sort: sort === "name" || sort === "steps" ? sort : "recent",
    };
}

/** Serialize filters back to a query string, omitting defaults. */
export function buildFlowQuery(f: FlowFilters): string {
    const p = new URLSearchParams();
    if (f.query.trim()) p.set("q", f.query.trim());
    if (f.project !== "all") p.set("project", f.project);
    if (f.sort !== "recent") p.set("sort", f.sort);
    return p.toString();
}

/** Map of cheat id → its project, for deriving a flow's projects from its steps. */
export function cheatProjectMap(cheats: Cheat[]): Map<number, string | null> {
    return new Map(cheats.map((c) => [c.id, c.project]));
}

/** The distinct non-null projects a flow draws from, via its step cheats. */
export function flowProjects(
    flow: Flow,
    cheatProjectById: Map<number, string | null>,
): Set<string> {
    const set = new Set<string>();
    for (const id of flow.steps) {
        const project = cheatProjectById.get(id);
        if (project) set.add(project);
    }
    return set;
}

/**
 * Apply project + search filters then sort. A flow matches a project if any of
 * its step cheats has that project ("any step" rule). `cheatProjectById` maps
 * step ids to projects; when the project filter is "all" it is unused.
 * Returns a new array.
 */
export function filterSortFlows(
    flows: Flow[],
    f: FlowFilters,
    cheatProjectById: Map<number, string | null> = new Map(),
): Flow[] {
    const q = f.query.trim().toLowerCase();
    const list = flows.filter((fl) => {
        if (f.project !== "all" && !flowProjects(fl, cheatProjectById).has(f.project)) {
            return false;
        }
        if (!q) return true;
        return (
            fl.name.toLowerCase().includes(q) ||
            (fl.description?.toLowerCase().includes(q) ?? false)
        );
    });
    return [...list].sort((a, b) => {
        if (f.sort === "name") return a.name.localeCompare(b.name);
        if (f.sort === "steps") return b.steps.length - a.steps.length;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
}
