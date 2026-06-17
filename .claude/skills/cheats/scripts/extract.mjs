#!/usr/bin/env node
// Extractor half of the Cheats generator. Walks ~/.claude/projects/**/*.jsonl,
// pulls genuine user-typed prompts (dropping slash-command wrappers, tool results,
// system reminders, and command stdout), dedupes by normalized hash, and writes
// the repo-root .cheats/raw.json. Dependency-free (Node built-ins only). Run:
//   node .claude/skills/cheats/scripts/extract.mjs            # extract
//   node .claude/skills/cheats/scripts/extract.mjs selftest   # asserts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MIN_LEN = 16;
const MAX_OUTPUT = 500;

// /g is required for stripNoise's replace() to remove ALL reminders. Do NOT call
// .test() on this shared regex — its lastIndex would persist across calls.
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
const COMMAND_TAG = /<command-(name|message|args)>/;
const STDOUT_TAG = /<local-command-stdout>/;

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

/** Drop system reminders and trim. Keeps the human-readable prompt body. */
function stripNoise(text) {
    return text.replace(SYSTEM_REMINDER, "").trim();
}

function isCommandNoise(text) {
    return COMMAND_TAG.test(text) || STDOUT_TAG.test(text);
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

/** Returns {original, ts, project} for a genuine user prompt, else null. */
function promptFromLine(obj) {
    if (!obj || obj.type !== "user" || obj.isMeta === true) return null;
    const raw = textFromContent(obj?.message?.content);
    if (!raw) return null;
    const cleaned = stripNoise(raw);
    if (!cleaned || isCommandNoise(cleaned) || cleaned.length < MIN_LEN) return null;
    const ts = Date.parse(obj?.timestamp);
    return {
        original: cleaned,
        ts: Number.isNaN(ts) ? Date.now() : ts,
        project: typeof obj?.cwd === "string" ? obj.cwd : null,
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

function extract() {
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
                    } else {
                        map.set(key, {
                            hash: key,
                            original: p.original,
                            occurrences: 1,
                            firstSeenMs: p.ts,
                            lastSeenMs: p.ts,
                            project: p.project,
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

    const prompts = [...map.values()]
        .sort((a, b) => b.occurrences - a.occurrences || b.lastSeenMs - a.lastSeenMs)
        .slice(0, MAX_OUTPUT)
        .map((e) => ({
            hash: e.hash,
            original: e.original,
            occurrences: e.occurrences,
            firstSeenAt: new Date(e.firstSeenMs).toISOString(),
            lastSeenAt: new Date(e.lastSeenMs).toISOString(),
            project: e.project,
        }));

    const manifest = {
        schemaVersion: SCHEMA_VERSION,
        extractedAt: new Date().toISOString(),
        projectsScanned: projects.size,
        transcriptsRead,
        prompts,
        errors,
    };

    const dir = path.join(repoRoot(), ".cheats");
    fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, "raw.json");
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    console.log(
        `[cheats] extracted ${prompts.length} unique prompts from ${transcriptsRead} transcripts → ${outPath}`,
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
    // command wrappers are rejected
    assert(promptFromLine({ type: "user", message: { content: "<command-name>foo</command-name>" } }) === null, "slash command wrapper rejected");
    assert(promptFromLine({ type: "user", message: { content: "<local-command-stdout>x</local-command-stdout>" } }) === null, "command stdout rejected");
    // meta + short rejected
    assert(promptFromLine({ type: "user", isMeta: true, message: { content: "a real long enough prompt here" } }) === null, "isMeta rejected");
    assert(promptFromLine({ type: "user", message: { content: "short" } }) === null, "too-short rejected");
    // genuine prompt accepted, tool_result blocks ignored
    const p = promptFromLine({
        type: "user",
        timestamp: "2026-01-01T00:00:00Z",
        cwd: "/repo",
        message: { content: [{ type: "text", text: "Please refactor the auth middleware token check" }, { type: "tool_result", content: "ignore me" }] },
    });
    assert(p && p.original === "Please refactor the auth middleware token check", "text block extracted, tool_result ignored");
    assert(p.project === "/repo", "project from cwd");
    // normalize collapses whitespace + case so near-dupes share a hash
    assert(hashOf(normalize("Do  X")) === hashOf(normalize("do x")), "normalize dedupes whitespace/case");
    console.log("OK extract selftest");
}

const arg = process.argv[2];
if (arg === "selftest") selftest();
else extract();
