// packages/presets/src/activate.ts
import { openDb } from "./db";
import { computeApplyDiff } from "./diff";
import { ApplyEventBus } from "./events";
import { writeInvocation } from "./frontmatter";
import { listPersonalItems, resolveItemPath } from "./identity";
import {
    getActiveState,
    getPreset,
    listPresetItems,
    setActiveState,
} from "./presets";
import { listPinned } from "./pinned";
import type {
    ApplyDiffEntry,
    ApplyOptions,
    ApplyResult,
} from "./types";

export type ApplyDeps = {
    bus?: ApplyEventBus;
};

export function applyPreset(
    presetId: number,
    opts: ApplyOptions = {},
    deps: ApplyDeps = {},
): ApplyResult {
    const bus = deps.bus;
    const start = Date.now();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot activate an archived preset");

    bus?.emit({ phase: "scanning" });
    const fsItems = listPersonalItems({ force: true });
    const presetItems = listPresetItems(presetId);
    const pinnedItems = listPinned({ status: "active" });

    const diff = computeApplyDiff({ presetItems, pinnedItems, fsItems });
    bus?.emit({ phase: "diff", diff });

    // Early no-op exit
    if (
        diff.enabled.length === 0 &&
        diff.disabled.length === 0 &&
        !opts.force &&
        !opts.dryRun
    ) {
        // Still set this as active so the user sees the "active" badge
        const db = openDb();
        const noopLogId = writeLog(db, {
            fromPresetId: getActiveState().presetId,
            toPresetId: presetId,
            diff,
            errors: [],
            durationMs: Date.now() - start,
            status: "success",
        });
        bus?.emit({
            phase: "done",
            result: {
                ...diff,
                status: "success",
                logId: noopLogId,
                errors: [],
                durationMs: Date.now() - start,
            },
        });
        return {
            ...diff,
            status: "success",
            logId: noopLogId,
            errors: [],
            durationMs: Date.now() - start,
        };
    }

    if (opts.dryRun) {
        const result: ApplyResult = {
            ...diff,
            status: "success",
            logId: null,
            errors: [],
            durationMs: Date.now() - start,
        };
        bus?.emit({ phase: "done", result });
        return result;
    }

    // Apply per-file, sequential. Touch enables first so user-pinned tools come
    // up before anything else gets disabled.
    const errors: ApplyDiffEntry[] = [];
    const enabledTotal = diff.enabled.length;
    const disabledTotal = diff.disabled.length;
    let ei = 0;
    for (const item of diff.enabled) {
        ei += 1;
        bus?.emit({
            phase: "enabling",
            current: ei,
            total: enabledTotal,
            currentItem: { kind: item.kind, identifier: item.identifier },
        });
        try {
            const path = resolveItemPath(item.kind, item.identifier);
            writeInvocation(path, "enabled");
        } catch (err) {
            errors.push({
                kind: item.kind,
                identifier: item.identifier,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    let di = 0;
    for (const item of diff.disabled) {
        di += 1;
        bus?.emit({
            phase: "disabling",
            current: di,
            total: disabledTotal,
            currentItem: { kind: item.kind, identifier: item.identifier },
        });
        try {
            const path = resolveItemPath(item.kind, item.identifier);
            writeInvocation(path, "disabled");
        } catch (err) {
            errors.push({
                kind: item.kind,
                identifier: item.identifier,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    bus?.emit({ phase: "logging" });
    const db = openDb();
    const status: ApplyResult["status"] = errors.length === 0
        ? "success"
        : errors.length === enabledTotal + disabledTotal
            ? "failed"
            : "partial";
    const logId = writeLog(db, {
        fromPresetId: getActiveState().presetId,
        toPresetId: presetId,
        diff,
        errors,
        durationMs: Date.now() - start,
        status,
    });

    const result: ApplyResult = {
        ...diff,
        status,
        logId,
        errors,
        durationMs: Date.now() - start,
    };
    bus?.emit({ phase: "done", result });
    return result;
}

type WriteLogInput = {
    fromPresetId: number | null;
    toPresetId: number;
    diff: { enabled: ApplyDiffEntry[]; disabled: ApplyDiffEntry[]; skipped: ApplyDiffEntry[]; missing: ApplyDiffEntry[] };
    errors: ApplyDiffEntry[];
    durationMs: number;
    status: "success" | "partial" | "failed";
};

function writeLog(db: ReturnType<typeof openDb>, input: WriteLogInput): number {
    return db.transaction(() => {
        const ts = new Date().toISOString();
        const info = db
            .prepare(
                `INSERT INTO apply_log (ts, from_preset_id, to_preset_id, enabled_count, disabled_count, skipped_count, error_count, duration_ms, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                ts,
                input.fromPresetId,
                input.toPresetId,
                input.diff.enabled.length - countErrors(input.errors, input.diff.enabled),
                input.diff.disabled.length - countErrors(input.errors, input.diff.disabled),
                input.diff.skipped.length,
                input.errors.length,
                input.durationMs,
                input.status,
            );
        const logId = Number(info.lastInsertRowid);

        const insertItem = db.prepare(
            `INSERT OR IGNORE INTO apply_log_items (log_id, kind, identifier, action, message) VALUES (?, ?, ?, ?, ?)`,
        );

        // Build a quick lookup of failed identifiers
        const errorSet = new Set(input.errors.map((e) => `${e.kind}::${e.identifier}`));

        for (const e of input.diff.enabled) {
            const k = `${e.kind}::${e.identifier}`;
            if (errorSet.has(k)) {
                const err = input.errors.find((x) => `${x.kind}::${x.identifier}` === k);
                insertItem.run(logId, e.kind, e.identifier, "error", err?.message ?? null);
            } else {
                insertItem.run(logId, e.kind, e.identifier, "enabled", null);
            }
        }
        for (const d of input.diff.disabled) {
            const k = `${d.kind}::${d.identifier}`;
            if (errorSet.has(k)) {
                const err = input.errors.find((x) => `${x.kind}::${x.identifier}` === k);
                insertItem.run(logId, d.kind, d.identifier, "error", err?.message ?? null);
            } else {
                insertItem.run(logId, d.kind, d.identifier, "disabled", null);
            }
        }
        for (const s of input.diff.skipped) {
            insertItem.run(logId, s.kind, s.identifier, "skipped", s.reason ?? null);
        }
        for (const m of input.diff.missing) {
            insertItem.run(logId, m.kind, m.identifier, "missing", null);
        }

        setActiveState(db, input.toPresetId);
        return logId;
    })();
}

function countErrors(errors: ApplyDiffEntry[], pool: ApplyDiffEntry[]): number {
    const poolKeys = new Set(pool.map((p) => `${p.kind}::${p.identifier}`));
    return errors.filter((e) => poolKeys.has(`${e.kind}::${e.identifier}`)).length;
}
