-- v2 cheats: reusable prompt library mined from Claude session history.
-- Written by packages/presets/scripts/import-cheats.mjs; read by src/cheats.ts.

CREATE TABLE IF NOT EXISTS cheats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_hash   TEXT    NOT NULL UNIQUE,   -- dedupe / upsert key (hash of normalized original)
    original      TEXT    NOT NULL,          -- raw past prompt, verbatim
    improved      TEXT,                      -- Claude rewrite (nullable)
    intent        TEXT,                      -- short category / intent label
    tags          TEXT    NOT NULL DEFAULT '[]', -- JSON array string
    reuse_score   INTEGER,                   -- reusability 0..100
    project       TEXT,                      -- origin project path
    occurrences   INTEGER NOT NULL DEFAULT 1,
    favorite      INTEGER NOT NULL DEFAULT 0, -- web-writable pin
    favorited_at  TEXT,
    first_seen_at TEXT    NOT NULL,
    last_seen_at  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cheats_favorite ON cheats(favorite);
CREATE INDEX IF NOT EXISTS idx_cheats_last_seen ON cheats(last_seen_at);

INSERT OR IGNORE INTO schema_version(version) VALUES (2);
