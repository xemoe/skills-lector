// packages/presets/src/types.ts

export type ItemKind = "skill" | "command";

export type Preset = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    color: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type PresetItem = {
    presetId: number;
    kind: ItemKind;
    identifier: string;
    addedAt: string;
};

export type PinnedItem = {
    kind: ItemKind;
    identifier: string;
    pinnedAt: string;
    reason: string | null;
    archivedAt: string | null;
};

export type ActiveState = {
    presetId: number | null;
    activatedAt: string | null;
};

export type ApplyAction =
    | "enabled"
    | "disabled"
    | "skipped"
    | "error"
    | "missing";

export type ApplyLog = {
    id: number;
    ts: string;
    fromPresetId: number | null;
    toPresetId: number | null;
    enabledCount: number;
    disabledCount: number;
    skippedCount: number;
    errorCount: number;
    durationMs: number;
    status: "success" | "partial" | "failed";
};

export type ApplyLogItem = {
    logId: number;
    kind: ItemKind;
    identifier: string;
    action: ApplyAction;
    message: string | null;
};

export type InvocationState = "enabled" | "disabled";

export type FsItem = {
    kind: ItemKind;
    identifier: string;
    currentInvocation: InvocationState;
    filePath: string;
};

export type ApplyDiffEntry = {
    kind: ItemKind;
    identifier: string;
    fromState?: InvocationState;
    toState?: InvocationState;
    reason?: string;
    message?: string;
};

export type ApplyDiff = {
    enabled: ApplyDiffEntry[];
    disabled: ApplyDiffEntry[];
    skipped: ApplyDiffEntry[];
    missing: ApplyDiffEntry[];
};

export type ApplyResult = ApplyDiff & {
    status: "success" | "partial" | "failed";
    logId: number | null;
    errors: ApplyDiffEntry[];
    durationMs: number;
};

export type ApplyOptions = {
    dryRun?: boolean;
    force?: boolean;
};

export type ApplyPhase =
    | "scanning"
    | "diff"
    | "enabling"
    | "disabling"
    | "logging"
    | "done"
    | "error";

export type ApplyEvent =
    | { phase: "scanning" }
    | { phase: "diff"; diff: ApplyDiff }
    | { phase: "enabling"; current: number; total: number; currentItem: { kind: ItemKind; identifier: string } }
    | { phase: "disabling"; current: number; total: number; currentItem: { kind: ItemKind; identifier: string } }
    | { phase: "logging" }
    | { phase: "done"; result: ApplyResult }
    | { phase: "error"; message: string };

/**
 * A reusable prompt mined from session history. Stored in the `cheats` table.
 * `tags` is persisted as a JSON TEXT column and parsed on read.
 */
/** "typed" = harness-confirmed user-typed; "legacy" = pre-provenance, unprovable. */
export type CheatProvenance = "typed" | "legacy";

export type Cheat = {
    id: number;
    promptHash: string;
    original: string;
    improved: string | null;
    intent: string | null;
    tags: string[];
    reuseScore: number | null;
    project: string | null;
    occurrences: number;
    provenance: CheatProvenance;
    favorite: boolean;
    favoritedAt: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    createdAt: string;
    updatedAt: string;
};
