// packages/presets/src/util.ts
// Tiny shared helpers for the presets package.

// nowIso lives in now.mjs (a .mjs so the .ts wrapper modules that must stay
// `node --experimental-strip-types`-testable can import it at runtime). Re-exported
// here so the package's other (bundler-only) modules keep importing it from "./util".
export { nowIso } from "./now.mjs";

/** Canonical composite identity key for a preset / pinned / fs item. */
export function itemKey(kind: string, identifier: string): string {
    return `${kind}::${identifier}`;
}
