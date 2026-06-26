// Pure diff between a flow's saved step order (server) and the in-progress draft.
// Drives the staged-edit UI: each row is tagged added / removed / moved /
// unchanged, removed steps are kept as ghost rows anchored to their original
// position, and per-item revert is a pure array transform. No React.

export type StepChange = "unchanged" | "added" | "removed" | "moved";

export interface StepDiffRow {
    cheatId: number;
    change: StepChange;
    /** Index among the draft steps; null for a removed ghost (not in the draft). */
    draftIndex: number | null;
}

export interface StepDiff {
    rows: StepDiffRow[]; // render order (draft order, removed ghosts spliced in)
    draftCount: number; // number of non-removed rows
    dirty: boolean;
    counts: { added: number; removed: number; moved: number };
}

/**
 * Ids of `a` that belong to a longest common subsequence with `b` — i.e. the
 * elements that kept their relative order. Anything common but *not* here moved.
 */
function lcsKeep(a: number[], b: number[]): Set<number> {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array<number>(n + 1).fill(0),
    );
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            dp[i][j] =
                a[i] === b[j]
                    ? dp[i + 1][j + 1] + 1
                    : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const keep = new Set<number>();
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            keep.add(a[i]);
            i++;
            j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }
    return keep;
}

/** Compare saved order (`server`) with the working `draft`. */
export function diffSteps(server: number[], draft: number[]): StepDiff {
    const serverSet = new Set(server);
    const draftSet = new Set(draft);

    // "moved" = a common id whose relative order changed (not in the LCS).
    const commonServer = server.filter((id) => draftSet.has(id));
    const commonDraft = draft.filter((id) => serverSet.has(id));
    const keep = lcsKeep(commonServer, commonDraft);
    const movedSet = new Set(commonDraft.filter((id) => !keep.has(id)));

    // Anchor each removed id to its nearest still-present predecessor in server,
    // so ghosts render where the step used to sit.
    const afterAnchor = new Map<number, number[]>();
    const frontRemoved: number[] = [];
    let lastPresent: number | null = null;
    for (const id of server) {
        if (draftSet.has(id)) {
            lastPresent = id;
        } else if (lastPresent === null) {
            frontRemoved.push(id);
        } else {
            const list = afterAnchor.get(lastPresent);
            if (list) list.push(id);
            else afterAnchor.set(lastPresent, [id]);
        }
    }

    const rows: StepDiffRow[] = [];
    for (const id of frontRemoved) {
        rows.push({ cheatId: id, change: "removed", draftIndex: null });
    }
    draft.forEach((id, idx) => {
        const change: StepChange = !serverSet.has(id)
            ? "added"
            : movedSet.has(id)
              ? "moved"
              : "unchanged";
        rows.push({ cheatId: id, change, draftIndex: idx });
        for (const r of afterAnchor.get(id) ?? []) {
            rows.push({ cheatId: r, change: "removed", draftIndex: null });
        }
    });

    const counts = {
        added: draft.filter((id) => !serverSet.has(id)).length,
        removed: server.filter((id) => !draftSet.has(id)).length,
        moved: movedSet.size,
    };
    const dirty = counts.added > 0 || counts.removed > 0 || counts.moved > 0;
    return { rows, draftCount: draft.length, dirty, counts };
}

/**
 * Place `id` back at the position it holds in `server`: right after its nearest
 * server-predecessor that is still present in `current` (or at the front).
 * Removing then re-inserting `id`, so it works for both un-remove and un-move.
 */
export function insertAtServerPosition(
    current: number[],
    id: number,
    server: number[],
): number[] {
    const without = current.filter((x) => x !== id);
    const si = server.indexOf(id);
    if (si === -1) return [...without, id];
    let insertAt = 0;
    for (let k = si - 1; k >= 0; k--) {
        const p = without.indexOf(server[k]);
        if (p !== -1) {
            insertAt = p + 1;
            break;
        }
    }
    return [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
}
