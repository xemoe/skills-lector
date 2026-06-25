// packages/core/src/cache.ts
// Shared in-process TTL cache used by the scanners. Each scanner keeps one
// instance at module scope; `force` bypasses, matching the old hand-rolled guard.

export const CACHE_TTL_MS = 8000;

export interface TtlCache<T> {
    /** Returns the cached value if fresh and not forced, else null. */
    get(force?: boolean): T | null;
    /** Stores and returns the value. */
    set(value: T): T;
    /** Drops the cached value. */
    clear(): void;
}

export function makeCache<T>(ttlMs: number = CACHE_TTL_MS): TtlCache<T> {
    let entry: { value: T; at: number } | null = null;
    return {
        get(force = false) {
            if (force || !entry) return null;
            return Date.now() - entry.at < ttlMs ? entry.value : null;
        },
        set(value) {
            entry = { value, at: Date.now() };
            return value;
        },
        clear() {
            entry = null;
        },
    };
}
