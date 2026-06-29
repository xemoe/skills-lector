// Run: node --experimental-strip-types packages/presets/src/flows.test.mjs
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    listFlows, getFlow, getFlowBySlug, createFlow, updateFlow,
    setFlowSteps, setFlowEnhanced, deleteFlow, seedFlows, SlugCollisionError,
} from "./flows.ts";
import { writeCheatAtomic } from "./cheats-store.mjs";

const tmp = join(homedir(), ".skills-lector", `flows-test-${process.pid}`);
process.env.SKILLS_LECTOR_STORE = tmp;

function cheat(id, intent, score) {
    return {
        id, promptHash: `h${id}`, original: `prompt ${id}`, improved: null,
        intent, tags: [], reuseScore: score, project: null, occurrences: 1,
        provenance: "legacy", favorite: false, favoritedAt: null,
        firstSeenAt: "2026-01-01T00:00:00.000Z", lastSeenAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
}

try {
    // create → get by id + slug
    const f = createFlow({ slug: "feature", name: "Feature" });
    assert.equal(f.id, 1, "first flow id = 1");
    assert.equal(getFlow(f.id).slug, "feature", "getFlow by id");
    assert.equal(getFlowBySlug("feature").id, f.id, "getFlowBySlug");

    // duplicate slug throws
    assert.throws(() => createFlow({ slug: "feature", name: "dup" }), SlugCollisionError, "duplicate slug");

    // update name/description, set steps, set enhanced
    updateFlow(f.id, { name: "Renamed", description: "d" });
    assert.equal(getFlow(f.id).name, "Renamed", "name updated");
    setFlowSteps(f.id, [10, 20, 30]);
    assert.deepEqual(getFlow(f.id).steps, [10, 20, 30], "steps set");
    setFlowEnhanced(f.id, [
        {
            cheatId: 10,
            variants: { short: "do it", long: "do it, carefully", precise: "do exactly it" },
            foldedIn: ["git"],
        },
    ]);
    let e = getFlow(f.id).enhanced;
    assert.equal(e.steps[0].cheatId, 10, "enhanced set");
    assert.equal(e.steps[0].variants.short, "do it", "short variant kept");
    assert.equal(e.steps[0].variants.precise, "do exactly it", "precise variant kept");
    assert.equal(e.steps[0].foldedIn[0], "git", "foldedIn kept");

    // legacy single-string `enhanced` migrates to all three variants on read
    setFlowEnhanced(f.id, [{ cheatId: 11, enhanced: "legacy text", foldedIn: [] }]);
    e = getFlow(f.id).enhanced;
    assert.equal(e.steps[0].variants.short, "legacy text", "legacy enhanced → short");
    assert.equal(e.steps[0].variants.long, "legacy text", "legacy enhanced → long");
    assert.equal(e.steps[0].variants.precise, "legacy text", "legacy enhanced → precise");

    // second flow → list sorts most-recently-updated first
    createFlow({ slug: "chore", name: "Chore" });
    assert.equal(listFlows()[0].slug, "chore", "newest flow first");

    // delete
    deleteFlow(f.id);
    assert.equal(getFlow(f.id), null, "deleted flow gone");

    // seedFlows: group cheats by intent, ≥2 per group, idempotent
    writeCheatAtomic(cheat(101, "debugging", 90));
    writeCheatAtomic(cheat(102, "debugging", 80));
    writeCheatAtomic(cheat(103, "solo", 50));
    const seeded = seedFlows();
    assert.equal(seeded.created.length, 1, "one group (debugging) seeded");
    assert.equal(seeded.created[0].slug, "debugging", "seeded slug from intent");
    assert.deepEqual(seeded.created[0].steps, [101, 102], "steps sorted by reuseScore desc");
    assert.equal(seedFlows().created.length, 0, "seedFlows idempotent");

    console.log("OK flows");
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
