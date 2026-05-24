// packages/presets/src/membership.ts
import { openDb } from "./db";
import { listPresets } from "./presets";
import type { Preset, ItemKind } from "./types";

/**
 * Serializable shape that crosses the React Server Components boundary as JSON.
 * itemsByPreset is a plain object keyed by stringified preset id; each value
 * is an array of "kind::identifier" strings. The explorer client materializes
 * a Map<number, Set<string>> from it for O(1) membership tests.
 */
export type PresetMembership = {
    presets: Preset[];
    itemsByPreset: Record<string, string[]>;
};

type DbRow = { preset_id: number; kind: ItemKind; identifier: string };

export function loadPresetMembership(): PresetMembership {
    try {
        const presets = listPresets({ status: "active" }).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        const db = openDb();
        const rows = db
            .prepare(
                `SELECT preset_id, kind, identifier FROM preset_items
                 WHERE preset_id IN (SELECT id FROM presets WHERE archived_at IS NULL)`,
            )
            .all() as DbRow[];
        const itemsByPreset: Record<string, string[]> = {};
        for (const r of rows) {
            const key = `${r.kind}::${r.identifier}`;
            const bucket = itemsByPreset[String(r.preset_id)] ?? [];
            bucket.push(key);
            itemsByPreset[String(r.preset_id)] = bucket;
        }
        return { presets, itemsByPreset };
    } catch {
        return { presets: [], itemsByPreset: {} };
    }
}
