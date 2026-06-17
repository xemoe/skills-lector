// Pure, framework-agnostic filter/sort logic for the Cheats catalog.
// Shared by the explorer (list page) and the detail-page prev/next nav so both
// derive the exact same ordered list from the same URL params. No React, no
// next/navigation here — the only input is a minimal `{ get }` params object.

import type { Cheat } from "@lector/presets/types";

export type SortKey = "recent" | "reuse" | "used";
export type TabKey = "all" | "favorites";
export type ViewMode = "table" | "cards";
export type ShowMode = "original" | "improved";

export interface CheatFilters {
    query: string;
    tab: TabKey;
    project: string; // "all" or a project path
    intent: string; // "all" or an intent
    sort: SortKey;
    view: ViewMode;
    show: ShowMode;
    typedOnly: boolean;
    page: number;
}

export const PAGE_SIZE = 10;

/** Anything URLSearchParams-like (covers Next's ReadonlyURLSearchParams). */
type ParamsLike = { get(name: string): string | null };

/** Parse URL params into a fully-defaulted filter object. Unknown values fall back to defaults. */
export function parseCheatFilters(sp: ParamsLike): CheatFilters {
    const sort = sp.get("sort");
    const view = sp.get("view");
    const show = sp.get("show");
    const tab = sp.get("tab");
    const pageRaw = Number(sp.get("page"));
    return {
        query: sp.get("q") ?? "",
        tab: tab === "favorites" ? "favorites" : "all",
        project: sp.get("project") ?? "all",
        intent: sp.get("intent") ?? "all",
        sort: sort === "reuse" || sort === "used" ? sort : "recent",
        view: view === "cards" ? "cards" : "table",
        show: show === "improved" ? "improved" : "original",
        typedOnly: sp.get("typed") === "1",
        page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    };
}

/** Serialize filters back to a query string, omitting defaults to keep URLs clean. */
export function buildCheatQuery(f: CheatFilters): string {
    const p = new URLSearchParams();
    if (f.query.trim()) p.set("q", f.query.trim());
    if (f.tab !== "all") p.set("tab", f.tab);
    if (f.project !== "all") p.set("project", f.project);
    if (f.intent !== "all") p.set("intent", f.intent);
    if (f.sort !== "recent") p.set("sort", f.sort);
    if (f.view !== "table") p.set("view", f.view);
    if (f.show !== "original") p.set("show", f.show);
    if (f.typedOnly) p.set("typed", "1");
    if (f.page > 1) p.set("page", String(f.page));
    return p.toString();
}

/** Apply tab/typed/project/intent/search filters then sort. Returns a new array. */
export function filterSortCheats(cheats: Cheat[], f: CheatFilters): Cheat[] {
    const q = f.query.trim().toLowerCase();
    const list = cheats.filter((c) => {
        if (f.tab === "favorites" && !c.favorite) return false;
        if (f.typedOnly && c.provenance !== "typed") return false;
        if (f.project !== "all" && c.project !== f.project) return false;
        if (f.intent !== "all" && c.intent !== f.intent) return false;
        if (!q) return true;
        return (
            c.original.toLowerCase().includes(q) ||
            (c.improved?.toLowerCase().includes(q) ?? false) ||
            (c.intent?.toLowerCase().includes(q) ?? false) ||
            c.tags.some((tag) => tag.toLowerCase().includes(q))
        );
    });
    return [...list].sort((a, b) => {
        if (f.sort === "reuse") return (b.reuseScore ?? -1) - (a.reuseScore ?? -1);
        if (f.sort === "used") return b.occurrences - a.occurrences;
        return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
    });
}

/** 1-based page that holds the item at `index` (or `fallback` if not found). */
export function pageOfIndex(index: number, fallback: number): number {
    return index >= 0 ? Math.floor(index / PAGE_SIZE) + 1 : fallback;
}

/** The displayed prompt text for the current show-mode (improved falls back to original). */
export function displayedPrompt(c: Cheat, show: ShowMode): string {
    return show === "improved" ? (c.improved ?? c.original) : c.original;
}
