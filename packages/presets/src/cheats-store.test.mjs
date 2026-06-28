// Run: node packages/presets/src/cheats-store.test.mjs
import assert from "node:assert/strict";
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    serializeCheat, parseCheatText, writeCheatAtomic, readCheat,
    listCheatFiles, nextCheatId, upsertMany, listHashes, keyOf, cheatsDir,
} from "./cheats-store.mjs";

const tmp = join(homedir(), ".skills-lector", `cheats-store-test-${process.pid}`);
process.env.SKILLS_LECTOR_STORE = tmp;

function mk(over = {}) {
    return {
        id: 1, promptHash: "h1", original: "do the thing", improved: "kindly do the thing",
        intent: "task", tags: ["a", "b"], reuseScore: 90, project: "/p", occurrences: 3,
        provenance: "typed", favorite: false, favoritedAt: null,
        firstSeenAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-02-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z", ...over,
    };
}

try {
    // round-trip: serialize then parse yields an equal object
    const c = mk();
    const round = parseCheatText(serializeCheat(c), c.id);
    assert.deepEqual(round, c, "round-trip equality");

    // multi-line original survives in the body
    const big = mk({ id: 2, promptHash: "h2", original: "line1\nline2\n  indented", improved: null, project: null });
    const r2 = parseCheatText(serializeCheat(big), 2);
    assert.equal(r2.original, "line1\nline2\n  indented", "multi-line original preserved");
    assert.equal(r2.improved, null, "null improved round-trips");

    // write + read by id, id comes from the filename
    writeCheatAtomic(c);
    assert.equal(readCheat(1).promptHash, "h1", "readCheat by id");
    assert.equal(nextCheatId(), 2, "nextCheatId = max+1");

    // upsert preserves favorite/favoritedAt/id/createdAt and does not downgrade typed
    writeCheatAtomic(mk({ id: 5, promptHash: keyOf("reuse me"), original: "reuse me", favorite: true, favoritedAt: "2026-03-01T00:00:00.000Z", provenance: "typed" }));
    const now = "2026-04-01T00:00:00.000Z";
    const res = upsertMany([{ original: "reuse me", improved: "v2", occurrences: 9, provenance: "legacy" }], now);
    assert.equal(res.imported, 1, "upsert updates 1");
    const updated = readCheat(5);
    assert.equal(updated.id, 5, "id preserved on upsert");
    assert.equal(updated.improved, "v2", "analysis updated");
    assert.equal(updated.occurrences, 9, "occurrences updated");
    assert.equal(updated.favorite, true, "favorite preserved");
    assert.equal(updated.favoritedAt, "2026-03-01T00:00:00.000Z", "favoritedAt preserved");
    assert.equal(updated.createdAt, mk().createdAt, "createdAt preserved");
    assert.equal(updated.provenance, "typed", "typed not downgraded");

    // new prompt gets a fresh id; caller-supplied hash is ignored
    const res2 = upsertMany([{ hash: "attacker", original: "brand new", provenance: "typed" }], now);
    assert.equal(res2.cheats[0].promptHash, keyOf("brand new"), "hash recomputed from original");
    assert.ok(res2.cheats[0].id > 5, "new cheat gets fresh id");

    // blank/null rows are skipped
    const res3 = upsertMany([{ original: "" }, null, { original: "ok one" }], now);
    assert.equal(res3.skipped, 2, "blank/null skipped");
    assert.equal(res3.imported, 1, "valid imported");

    assert.ok(listHashes().includes(keyOf("reuse me")), "listHashes includes stored row");

    // graceful degradation: a malformed file goes to errors, valid files still parse
    mkdirSync(cheatsDir(), { recursive: true });
    writeFileSync(join(cheatsDir(), "999.md"), "no frontmatter here", "utf8");
    const listed = listCheatFiles();
    assert.equal(listed.errors.length, 1, "malformed file recorded in errors");
    assert.ok(listed.cheats.every((c) => c.id !== 999), "malformed file not in cheats");

    // reuseScore is clamped to [0,100] on upsert
    const clamp = upsertMany([{ original: "clamp me", reuseScore: 150 }], now);
    assert.equal(clamp.cheats[0].reuseScore, 100, "reuseScore clamped to 100");

    console.log("OK cheats-store");
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
