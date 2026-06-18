#!/usr/bin/env node
// Extractor half of the Cheats generator. Walks ~/.claude/projects/**/*.jsonl,
// pulls genuine user-typed prompts (dropping subagent task-prompts, slash-command
// wrappers, tool results, system reminders, command stdout, and interrupt markers),
// dedupes by normalized hash, tags each with provenance, and writes the repo-root
// .cheats/raw.json. Dependency-free (Node built-ins only). Run:
//   node .claude/skills/cheats/scripts/extract.mjs            # extract
//   node .claude/skills/cheats/scripts/extract.mjs selftest   # asserts
//
// Provenance: the harness stamps each user entry with `promptSource`. "typed" means
// the user typed it; "system" means hook/system-injected (dropped). Entries from
// before the field existed lack it — kept but tagged "legacy" (can't be proven typed).
// Subagent prompts carry isSidechain:true and are dropped regardless.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 2; // bumped: entries now carry `provenance`
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MIN_LEN = 16;
const MAX_OUTPUT = 500;
// Written by import-cheats.mjs after every import; the set of prompt hashes already
// in the library. Default ("only-new") mode skips these so re-running NEVER
// re-analyzes or overwrites curated entries. `--full` ignores it and re-extracts all.
const KNOWN_HASHES_FILE = "known-hashes.json";

// /g is required for stripNoise's replace() to remove ALL reminders. Do NOT call
// .test() on this shared regex — its lastIndex would persist across calls.
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
const COMMAND_TAG = /<command-(name|message|args)>/;
const STDOUT_TAG = /<local-command-stdout>/;
// Harness-injected wrappers that ride in as user-role turns but were never typed:
// background-task completion notices and the local-command caveat banner.
const HARNESS_TAG = /<(task-notification|local-command-caveat)>/;
// Harness-injected marker when the user aborts (e.g. "[Request interrupted by user]").
const INTERRUPT = /^\[request interrupted/i;

function claudeHome() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** Repo root = 4 levels up from this script (.claude/skills/cheats/scripts/). */
function repoRoot() {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, "..", "..", "..", "..");
}

function hashOf(s) {
    return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/**
 * Load the hashes already in the cheats library (written by import-cheats). Returns
 * a Set, or null when there is no library yet / the file is unreadable — in which
 * case extract falls back to full (everything is "new"). Errors are non-fatal.
 */
function loadKnownHashes(errors) {
    const file = path.join(repoRoot(), ".cheats", KNOWN_HASHES_FILE);
    if (!fs.existsSync(file)) return null;
    try {
        const arr = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!Array.isArray(arr)) throw new Error("expected a JSON array of hashes");
        return new Set(arr.filter((h) => typeof h === "string"));
    } catch (e) {
        errors.push(`read ${file}: ${e.message} (falling back to full extract)`);
        return null;
    }
}

/** Pure: drop entries whose hash is already in the library. No-op when `known` is empty. */
function dropKnown(entries, known) {
    if (!known || !known.size) return entries;
    return entries.filter((e) => !known.has(e.hash));
}

/** Drop system reminders and trim. Keeps the human-readable prompt body. */
function stripNoise(text) {
    return text.replace(SYSTEM_REMINDER, "").trim();
}

function isCommandNoise(text) {
    return (
        COMMAND_TAG.test(text) ||
        STDOUT_TAG.test(text) ||
        HARNESS_TAG.test(text) ||
        INTERRUPT.test(text)
    );
}

/**
 * Provenance from the harness stamp. "typed" only when promptSource explicitly
 * says so; everything else that survived the hard-drop filters is "legacy"
 * (older entries predate the field — kept but not provable).
 */
function provenanceOf(obj) {
    return obj?.promptSource === "typed" ? "typed" : "legacy";
}

/** Collapse whitespace so trivially different copies dedupe together. */
function normalize(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function textFromContent(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .filter((b) => b && b.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("\n");
    }
    return "";
}

/** Returns {original, ts, project, provenance} for a genuine user prompt, else null. */
function promptFromLine(obj) {
    if (!obj || obj.type !== "user") return null;
    // Hard-drop everything that is provably NOT a user-typed prompt.
    if (obj.isMeta === true || obj.isSidechain === true) return null; // meta / subagent
    if (typeof obj.userType === "string" && obj.userType !== "external") return null; // internal
    if (obj.promptSource === "system") return null; // hook/system-injected
    const raw = textFromContent(obj?.message?.content);
    if (!raw) return null;
    const cleaned = stripNoise(raw);
    if (!cleaned || isCommandNoise(cleaned) || cleaned.length < MIN_LEN) return null;
    const ts = Date.parse(obj?.timestamp);
    return {
        original: cleaned,
        ts: Number.isNaN(ts) ? Date.now() : ts,
        project: typeof obj?.cwd === "string" ? obj.cwd : null,
        provenance: provenanceOf(obj),
    };
}

function findTranscripts(root, errors) {
    const out = [];
    const walk = (dir, depth) => {
        if (depth > 6) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            errors.push(`read ${dir}: ${e.message}`);
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full, depth + 1);
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) out.push(full);
        }
    };
    walk(root, 0);
    return out;
}

function extract({ onlyNew } = { onlyNew: true }) {
    const errors = [];
    const root = path.join(claudeHome(), "projects");
    const map = new Map(); // normalized-hash -> aggregate
    let transcriptsRead = 0;
    const projects = new Set();

    if (fs.existsSync(root)) {
        const files = findTranscripts(root, errors)
            .map((f) => {
                let mtime = 0;
                try {
                    mtime = fs.statSync(f).mtimeMs;
                } catch {
                    /* handled on read */
                }
                return { f, mtime };
            })
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, MAX_FILES);

        for (const { f } of files) {
            try {
                if (fs.statSync(f).size > MAX_FILE_BYTES) continue;
                const text = fs.readFileSync(f, "utf8");
                transcriptsRead++;
                for (const line of text.split("\n")) {
                    if (!line) continue;
                    let obj;
                    try {
                        obj = JSON.parse(line);
                    } catch {
                        continue;
                    }
                    const p = promptFromLine(obj);
                    if (!p) continue;
                    if (p.project) projects.add(p.project);
                    const key = hashOf(normalize(p.original));
                    const ex = map.get(key);
                    if (ex) {
                        ex.occurrences++;
                        ex.firstSeenMs = Math.min(ex.firstSeenMs, p.ts);
                        ex.lastSeenMs = Math.max(ex.lastSeenMs, p.ts);
                        if (!ex.project && p.project) ex.project = p.project;
                        // typed wins: one proven-typed sighting upgrades the cluster.
                        if (p.provenance === "typed") ex.provenance = "typed";
                    } else {
                        map.set(key, {
                            hash: key,
                            original: p.original,
                            occurrences: 1,
                            firstSeenMs: p.ts,
                            lastSeenMs: p.ts,
                            project: p.project,
                            provenance: p.provenance,
                        });
                    }
                }
            } catch (e) {
                errors.push(`read ${f}: ${e.message}`);
            }
        }
    } else {
        errors.push(`no transcripts directory at ${root}`);
    }

    // Default mode skips prompts already in the library so re-runs never re-analyze
    // or overwrite curated entries. `--full` passes onlyNew:false to rebuild everything.
    const known = onlyNew ? loadKnownHashes(errors) : null;
    const aggregated = [...map.values()];
    const newOnly = dropKnown(aggregated, known);
    const skippedKnown = aggregated.length - newOnly.length;

    const prompts = newOnly
        .sort((a, b) => b.occurrences - a.occurrences || b.lastSeenMs - a.lastSeenMs)
        .slice(0, MAX_OUTPUT)
        .map((e) => ({
            hash: e.hash,
            original: e.original,
            occurrences: e.occurrences,
            firstSeenAt: new Date(e.firstSeenMs).toISOString(),
            lastSeenAt: new Date(e.lastSeenMs).toISOString(),
            project: e.project,
            provenance: e.provenance,
        }));

    const typedCount = prompts.filter((p) => p.provenance === "typed").length;
    const manifest = {
        schemaVersion: SCHEMA_VERSION,
        extractedAt: new Date().toISOString(),
        mode: onlyNew ? "only-new" : "full",
        knownHashes: known ? known.size : 0,
        skippedKnown,
        projectsScanned: projects.size,
        transcriptsRead,
        typedCount,
        legacyCount: prompts.length - typedCount,
        prompts,
        errors,
    };

    const dir = path.join(repoRoot(), ".cheats");
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, "raw.json");
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    const modeNote = onlyNew
        ? known
            ? `only-new — skipped ${skippedKnown} already in library`
            : `only-new — no library yet, treating all as new`
        : `full — re-extracting everything`;
    console.log(
        `[cheats] extracted ${prompts.length} prompts [${modeNote}] (${typedCount} typed, ${prompts.length - typedCount} legacy) from ${transcriptsRead} transcripts → ${outPath}`,
    );
    if (errors.length) console.log(`[cheats] ${errors.length} read error(s) (see raw.json)`);
}

function assert(cond, msg) {
    if (!cond) {
        console.error(`FAIL: ${msg}`);
        process.exit(1);
    }
}

function selftest() {
    // stripNoise removes system reminders
    assert(
        stripNoise("hello <system-reminder>secret</system-reminder> world") === "hello  world".trim(),
        "stripNoise should drop system reminders",
    );
    // command wrappers + interrupt markers are rejected
    assert(promptFromLine({ type: "user", message: { content: "<command-name>foo</command-name>" } }) === null, "slash command wrapper rejected");
    assert(promptFromLine({ type: "user", message: { content: "<local-command-stdout>x</local-command-stdout>" } }) === null, "command stdout rejected");
    assert(promptFromLine({ type: "user", message: { content: "[Request interrupted by user]" } }) === null, "interrupt marker rejected");
    assert(promptFromLine({ type: "user", message: { content: "<task-notification><task-id>w1</task-id> done</task-notification>" } }) === null, "task-notification rejected");
    // meta + short rejected
    assert(promptFromLine({ type: "user", isMeta: true, message: { content: "a real long enough prompt here" } }) === null, "isMeta rejected");
    assert(promptFromLine({ type: "user", message: { content: "short" } }) === null, "too-short rejected");
    // provenance hard-drops: subagent / internal / system-injected are NOT user prompts
    assert(promptFromLine({ type: "user", isSidechain: true, message: { content: "a real long enough prompt here" } }) === null, "isSidechain (subagent) rejected");
    assert(promptFromLine({ type: "user", userType: "internal", message: { content: "a real long enough prompt here" } }) === null, "non-external userType rejected");
    assert(promptFromLine({ type: "user", promptSource: "system", message: { content: "a real long enough prompt here" } }) === null, "promptSource=system rejected");
    // genuine prompt accepted, tool_result blocks ignored
    const p = promptFromLine({
        type: "user",
        promptSource: "typed",
        timestamp: "2026-01-01T00:00:00Z",
        cwd: "/repo",
        message: { content: [{ type: "text", text: "Please refactor the auth middleware token check" }, { type: "tool_result", content: "ignore me" }] },
    });
    assert(p && p.original === "Please refactor the auth middleware token check", "text block extracted, tool_result ignored");
    assert(p.project === "/repo", "project from cwd");
    // provenance tagging: explicit promptSource=typed vs missing (legacy)
    assert(p.provenance === "typed", "promptSource=typed → provenance typed");
    const legacy = promptFromLine({ type: "user", message: { content: "a real long enough prompt here" } });
    assert(legacy && legacy.provenance === "legacy", "missing promptSource → provenance legacy");
    // normalize collapses whitespace + case so near-dupes share a hash
    assert(hashOf(normalize("Do  X")) === hashOf(normalize("do x")), "normalize dedupes whitespace/case");
    // only-new filter: known hashes are dropped; a null/empty set is a no-op
    assert(dropKnown([{ hash: "a" }, { hash: "b" }], new Set(["a"])).length === 1, "dropKnown removes known hashes");
    assert(dropKnown([{ hash: "a" }, { hash: "b" }], new Set(["a"]))[0].hash === "b", "dropKnown keeps the unknown one");
    assert(dropKnown([{ hash: "a" }], null).length === 1, "dropKnown is a no-op with no known set");
    assert(dropKnown([{ hash: "a" }], new Set()).length === 1, "dropKnown is a no-op with an empty known set");
    console.log("OK extract selftest");
}

const cliArgs = process.argv.slice(2);
if (cliArgs.includes("selftest")) selftest();
else extract({ onlyNew: !(cliArgs.includes("--full") || cliArgs.includes("--all")) });
