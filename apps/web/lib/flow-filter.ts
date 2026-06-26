// Pure, framework-agnostic filter/sort for the Flows catalog. Shared by the
// explorer (list) and the detail-page back/prev/next nav so both derive the
// same ordered list from the same URL params. No React, no next/navigation —
// the only input is a minimal `{ get }` params object.

import type { Flow } from "@lector/presets/types";

export type FlowSortKey = "recent" | "name" | "steps";

export interface FlowFilters {
    query: string;
    sort: FlowSortKey;
}

/** Anything URLSearchParams-like (covers Next's ReadonlyURLSearchParams). */
type ParamsLike = { get(name: string): string | null };

/** Parse URL params into a fully-defaulted filter object. */
export function parseFlowFilters(sp: ParamsLike): FlowFilters {
    const sort = sp.get("sort");
    return {
        query: sp.get("q") ?? "",
        sort: sort === "name" || sort === "steps" ? sort : "recent",
    };
}

/** Serialize filters back to a query string, omitting defaults. */
export function buildFlowQuery(f: FlowFilters): string {
    const p = new URLSearchParams();
    if (f.query.trim()) p.set("q", f.query.trim());
    if (f.sort !== "recent") p.set("sort", f.sort);
    return p.toString();
}

/** Apply the search filter then sort. Returns a new array. */
export function filterSortFlows(flows: Flow[], f: FlowFilters): Flow[] {
    const q = f.query.trim().toLowerCase();
    const list = flows.filter((fl) => {
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
