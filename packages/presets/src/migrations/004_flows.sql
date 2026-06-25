-- v4 flows: ordered sequences of cheats ("workflows") for a kind of work.
-- Written + read by src/flows.ts (web-mutating, like presets).

CREATE TABLE IF NOT EXISTS flows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    description TEXT,
    steps       TEXT    NOT NULL DEFAULT '[]',  -- JSON array of cheat ids, ordered
    seeded      INTEGER NOT NULL DEFAULT 0,      -- 1 = auto-seeded starter
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flows_slug ON flows(slug);

INSERT OR IGNORE INTO schema_version(version) VALUES (4);
