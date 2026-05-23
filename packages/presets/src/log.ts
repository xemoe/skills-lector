// packages/presets/src/log.ts
import { openDb } from "./db";
import type { ApplyLog, ApplyLogItem, ItemKind, ApplyAction } from "./types";

type DbLogRow = {
    id: number;
    ts: string;
    from_preset_id: number | null;
    to_preset_id: number | null;
    enabled_count: number;
    disabled_count: number;
    skipped_count: number;
    error_count: number;
    duration_ms: number;
    status: "success" | "partial" | "failed";
};

function rowToLog(r: DbLogRow): ApplyLog {
    return {
        id: r.id,
        ts: r.ts,
        fromPresetId: r.from_preset_id,
        toPresetId: r.to_preset_id,
        enabledCount: r.enabled_count,
        disabledCount: r.disabled_count,
        skippedCount: r.skipped_count,
        errorCount: r.error_count,
        durationMs: r.duration_ms,
        status: r.status,
    };
}

export type ListLogOptions = {
    limit?: number;
    offset?: number;
    presetId?: number;
};

export function listApplyLog(opts: ListLogOptions = {}): ApplyLog[] {
    const db = openDb();
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    let sql = `SELECT id, ts, from_preset_id, to_preset_id, enabled_count, disabled_count, skipped_count, error_count, duration_ms, status FROM apply_log`;
    const params: unknown[] = [];
    if (opts.presetId !== undefined) {
        sql += ` WHERE from_preset_id = ? OR to_preset_id = ?`;
        params.push(opts.presetId, opts.presetId);
    }
    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rows = db.prepare(sql).all(...params) as DbLogRow[];
    return rows.map(rowToLog);
}

type DbLogItemRow = {
    log_id: number;
    kind: ItemKind;
    identifier: string;
    action: ApplyAction;
    message: string | null;
};

export function getApplyLogItems(logId: number): ApplyLogItem[] {
    const db = openDb();
    const rows = db
        .prepare(
            `SELECT log_id, kind, identifier, action, message FROM apply_log_items WHERE log_id = ? ORDER BY kind, identifier`,
        )
        .all(logId) as DbLogItemRow[];
    return rows.map((r) => ({
        logId: r.log_id,
        kind: r.kind,
        identifier: r.identifier,
        action: r.action,
        message: r.message,
    }));
}
