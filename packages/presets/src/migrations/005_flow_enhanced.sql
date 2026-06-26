-- v5 flow enhancement: per-step skill-aware rewrite, shown on the flow detail
-- page. JSON blob written by src/flows.ts setFlowEnhanced (web-mutating, via the
-- /api/flows/[id]/enhance POST). Shape: { generatedAt, steps: [{ cheatId,
-- enhanced, foldedIn: [] }] }. Keyed by cheatId so it survives step reorder.

ALTER TABLE flows ADD COLUMN enhanced TEXT;

INSERT OR IGNORE INTO schema_version(version) VALUES (5);
