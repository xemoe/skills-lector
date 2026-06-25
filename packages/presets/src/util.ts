// packages/presets/src/util.ts
// Tiny shared helpers for the presets package.

/** Canonical composite identity key for a preset / pinned / fs item. */
export function itemKey(kind: string, identifier: string): string {
    return `${kind}::${identifier}`;
}

/** Current time as an ISO-8601 string. Single source for stored timestamps. */
export function nowIso(): string {
    return new Date().toISOString();
}
