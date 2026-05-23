// packages/presets/src/pinned.ts
import { openDb } from "./db";
import type { PinnedItem, ItemKind } from "./types";

type DbPinnedRow = {
    kind: ItemKind;
    identifier: string;
    pinned_at: string;
    reason: string | null;
    archived_at: string | null;
};

function rowToPinned(r: DbPinnedRow): PinnedItem {
    return {
        kind: r.kind,
        identifier: r.identifier,
        pinnedAt: r.pinned_at,
        reason: r.reason,
        archivedAt: r.archived_at,
    };
}

function nowIso(): string {
    return new Date().toISOString();
}

export type ListPinnedOptions = { status?: "active" | "archived" | "all" };

export function listPinned(opts: ListPinnedOptions = {}): PinnedItem[] {
    const db = openDb();
    const status = opts.status ?? "active";
    let where = "";
    if (status === "active") where = "WHERE archived_at IS NULL";
    else if (status === "archived") where = "WHERE archived_at IS NOT NULL";
    const rows = db
        .prepare(
            `SELECT kind, identifier, pinned_at, reason, archived_at FROM pinned_items ${where} ORDER BY kind, identifier`,
        )
        .all() as DbPinnedRow[];
    return rows.map(rowToPinned);
}

export function addPin(
    kind: ItemKind,
    identifier: string,
    reason?: string | null,
): PinnedItem {
    const db = openDb();
    const ts = nowIso();
    db.prepare(
        `INSERT INTO pinned_items (kind, identifier, pinned_at, reason)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(kind, identifier) DO UPDATE SET
           pinned_at = excluded.pinned_at,
           reason    = excluded.reason,
           archived_at = NULL`,
    ).run(kind, identifier, ts, reason ?? null);
    const row = db
        .prepare(
            `SELECT kind, identifier, pinned_at, reason, archived_at FROM pinned_items WHERE kind = ? AND identifier = ?`,
        )
        .get(kind, identifier) as DbPinnedRow;
    return rowToPinned(row);
}

export function archivePin(kind: ItemKind, identifier: string): void {
    const db = openDb();
    const ts = nowIso();
    db.prepare(
        `UPDATE pinned_items SET archived_at = ? WHERE kind = ? AND identifier = ?`,
    ).run(ts, kind, identifier);
}

export function unarchivePin(kind: ItemKind, identifier: string): void {
    const db = openDb();
    db.prepare(
        `UPDATE pinned_items SET archived_at = NULL WHERE kind = ? AND identifier = ?`,
    ).run(kind, identifier);
}
