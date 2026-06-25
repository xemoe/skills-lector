// packages/presets/src/diff.ts
import type {
    ApplyDiff,
    ApplyDiffEntry,
    FsItem,
    PinnedItem,
    PresetItem,
} from "./types";
import { itemKey } from "./util";

type DiffInput = {
    presetItems: Pick<PresetItem, "kind" | "identifier">[];
    pinnedItems: Pick<PinnedItem, "kind" | "identifier">[];
    fsItems: FsItem[];
};

/**
 * Pure function — computes what would happen if we applied the given preset.
 * Does not touch the filesystem or the database.
 *
 * Rules:
 *  - targetEnabled = presetItems ∪ pinnedItems
 *  - For each fsItem:
 *      pinned                                  → skipped("pinned")
 *      in preset and currently enabled         → skipped("already-correct")
 *      in preset and currently disabled        → ENABLE
 *      not in preset and currently enabled     → DISABLE
 *      not in preset and currently disabled    → skipped("already-correct")
 *  - For each presetItem absent from fsItems   → missing
 *
 * Pinned overrides preset: if an item is in the preset but also pinned,
 * it is skipped with reason "pinned" (and stays enabled).
 */
export function computeApplyDiff(input: DiffInput): ApplyDiff {
    const pinnedKeys = new Set(
        input.pinnedItems.map((p) => itemKey(p.kind, p.identifier)),
    );
    const presetKeys = new Set(
        input.presetItems.map((p) => itemKey(p.kind, p.identifier)),
    );
    const fsKeys = new Set(input.fsItems.map((f) => itemKey(f.kind, f.identifier)));

    const enabled: ApplyDiffEntry[] = [];
    const disabled: ApplyDiffEntry[] = [];
    const skipped: ApplyDiffEntry[] = [];
    const missing: ApplyDiffEntry[] = [];

    for (const fsItem of input.fsItems) {
        const k = itemKey(fsItem.kind, fsItem.identifier);
        const entry: ApplyDiffEntry = {
            kind: fsItem.kind,
            identifier: fsItem.identifier,
            fromState: fsItem.currentInvocation,
        };
        if (pinnedKeys.has(k)) {
            skipped.push({ ...entry, reason: "pinned" });
            continue;
        }
        const wanted = presetKeys.has(k);
        if (wanted && fsItem.currentInvocation === "enabled") {
            skipped.push({ ...entry, reason: "already-correct" });
        } else if (wanted && fsItem.currentInvocation === "disabled") {
            enabled.push({ ...entry, toState: "enabled" });
        } else if (!wanted && fsItem.currentInvocation === "enabled") {
            disabled.push({ ...entry, toState: "disabled" });
        } else {
            // !wanted && currently disabled
            skipped.push({ ...entry, reason: "already-correct" });
        }
    }

    for (const p of input.presetItems) {
        const k = itemKey(p.kind, p.identifier);
        if (!fsKeys.has(k)) {
            missing.push({ kind: p.kind, identifier: p.identifier });
        }
    }

    return { enabled, disabled, skipped, missing };
}
