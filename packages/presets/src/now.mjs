// packages/presets/src/now.mjs
// Current time as an ISO-8601 string. Single source for stored timestamps.
// Lives in a .mjs (not in util.ts) so the .ts wrapper modules that must stay
// `node --experimental-strip-types`-testable (cheats.ts, flows.ts) can import it
// at runtime — node ESM can't resolve a bare relative .ts import, only .mjs.
/** @returns {string} */
export const nowIso = () => new Date().toISOString();
