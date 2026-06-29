// Project options derived from cheats. A project is the raw cwd path captured
// on a cheat; the display label is its basename (see `basename` in ./utils).
// Shared by the cheats explorer, the flows toolbar, and the cheat picker so
// every project dropdown is built the same way.

import type { Cheat } from "@lector/presets/types";

/** Sorted, deduped, non-null project paths across the given cheats. */
export function distinctProjects(cheats: Cheat[]): string[] {
    const set = new Set<string>();
    for (const c of cheats) if (c.project) set.add(c.project);
    return [...set].sort();
}
