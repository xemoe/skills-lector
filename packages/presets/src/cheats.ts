// packages/presets/src/cheats.ts
// Read side of the Cheats feature + the single favorite mutation. The on-disk
// format + IO live in cheats-store.mjs (shared with scripts/import-cheats.mjs so
// the writer and reader can't drift). This module is the typed surface the web
// imports; signatures are unchanged from the previous SQLite implementation.
import {
    listCheatFiles,
    readCheat,
    writeCheatAtomic,
} from "./cheats-store.mjs";
import { nowIso } from "./util.ts";
import type { Cheat } from "./types";

/** All cheats, favorites first then most-recently-seen. */
export function listCheats(): Cheat[] {
    const cheats = listCheatFiles().cheats as Cheat[];
    return cheats.sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.lastSeenAt.localeCompare(a.lastSeenAt);
    });
}

/** Returns a single cheat by numeric id, or null if not found. */
export function getCheat(id: number): Cheat | null {
    return readCheat(id) as Cheat | null;
}

/** Toggle a favorite. Returns the updated cheat, or null if the id is unknown. */
export function setFavorite(id: number, on: boolean): Cheat | null {
    const cheat = readCheat(id) as Cheat | null;
    if (!cheat) return null;
    const updated: Cheat = {
        ...cheat,
        favorite: on,
        favoritedAt: on ? nowIso() : null,
    };
    writeCheatAtomic(updated);
    return updated;
}
