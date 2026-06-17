-- v3 cheats: provenance tag. "typed" = harness-confirmed user-typed prompt;
-- "legacy" = pre-provenance entry that can't be proven typed (the safe default,
-- which is also what every row imported before this migration becomes).
-- Written by packages/presets/scripts/import-cheats.mjs; read by src/cheats.ts.
-- SQLite has no `ADD COLUMN IF NOT EXISTS`; the version gate in db.ts runs this
-- once, and the runner treats a replayed "duplicate column" as already-applied.

ALTER TABLE cheats ADD COLUMN provenance TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_cheats_provenance ON cheats(provenance);

INSERT OR IGNORE INTO schema_version(version) VALUES (3);
