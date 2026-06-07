import fs from "fs";
import path from "path";
import { claudeHome } from "./claude-paths";
import { safeExists } from "./scanner";

/** How an invocation reached Claude Code. */
export type InvocationVia = "skill-tool" | "slash";

/**
 * Where an invocation ran: the top-level session ("main"), inside an Agent-tool
 * subagent ("subagent"), or inside a dynamic Workflow agent ("workflow").
 * Recovered from the transcript's location on disk, not its contents.
 */
export type InvocationOrigin = "main" | "subagent" | "workflow";

/** A single skill/command invocation recovered from a session transcript. */
export interface ActivityEvent {
    /** Raw invocation name as it appears in the transcript. */
    name: string;
    /** Epoch milliseconds. */
    ts: number;
    via: InvocationVia;
    /** Execution context the invocation ran in. */
    origin: InvocationOrigin;
}

export interface ActivityResult {
    /** Every recovered invocation, sorted oldest → newest. */
    events: ActivityEvent[];
    /** Transcript files successfully read. */
    fileCount: number;
    scannedAt: string;
    errors: string[];
    durationMs: number;
}

const CACHE_TTL_MS = 8000;
/** Skip pathologically large transcripts so the scan stays bounded. */
const MAX_FILE_BYTES = 64 * 1024 * 1024;
/** Read only the newest N transcripts. */
const MAX_FILES = 2000;
const COMMAND_RE = /<command-name>\s*([^<]+?)\s*<\/command-name>/;

let cache: { result: ActivityResult; at: number } | null = null;

/** Recursively collects every .jsonl transcript under a directory. */
function findTranscripts(root: string, errors: string[]): string[] {
    const out: string[] = [];
    const walk = (dir: string, depth: number) => {
        if (depth > 6) return;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            errors.push(`read ${dir}: ${(e as Error).message}`);
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) {
                out.push(full);
            }
        }
    };
    walk(root, 0);
    return out;
}

/**
 * Classifies a transcript by where its events ran. Subagent transcripts live
 * under a `subagents` directory in the session; workflow agents nest one level
 * deeper, inside `subagents/workflows/<wf-id>`. Matched on the path *relative to
 * the scan root* so a root that itself contains a `subagents` segment (e.g. a
 * `CLAUDE_CONFIG_DIR` override) can't misclassify every transcript. Path-segment
 * based so it holds on both POSIX and Windows separators.
 */
function originOf(file: string, root: string): InvocationOrigin {
    const segments = path.relative(root, file).split(path.sep);
    const idx = segments.indexOf("subagents");
    if (idx === -1) return "main";
    return segments.slice(idx + 1).includes("workflows") ? "workflow" : "subagent";
}

/** Extracts skill/command invocations from one parsed transcript line. */
function eventsFromLine(obj: any, origin: InvocationOrigin): ActivityEvent[] {
    const ts = Date.parse(obj?.timestamp);
    if (!ts || Number.isNaN(ts)) return [];
    const content = obj?.message?.content;
    const out: ActivityEvent[] = [];

    if (Array.isArray(content)) {
        // A model-invoked skill surfaces as a `Skill` tool_use block.
        for (const block of content) {
            if (block?.type === "tool_use" && block?.name === "Skill") {
                const skill = block?.input?.skill;
                if (typeof skill === "string" && skill.trim()) {
                    out.push({ name: skill.trim(), ts, via: "skill-tool", origin });
                }
            }
        }
    } else if (typeof content === "string" && obj?.type === "user") {
        // A typed slash invocation is wrapped in a <command-name> tag.
        const m = content.match(COMMAND_RE);
        if (m && m[1].trim()) {
            out.push({ name: m[1].trim(), ts, via: "slash", origin });
        }
    }
    return out;
}

/** Scans every Claude Code session transcript for skill and command invocations. */
export function scanActivity(opts: { force?: boolean } = {}): ActivityResult {
    if (!opts.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
        return cache.result;
    }

    const started = Date.now();
    const errors: string[] = [];
    const root = path.join(claudeHome(), "projects");
    const events: ActivityEvent[] = [];
    let fileCount = 0;

    if (safeExists(root)) {
        const files = findTranscripts(root, errors)
            .map((f) => {
                let mtime = 0;
                try {
                    mtime = fs.statSync(f).mtimeMs;
                } catch {
                    /* ignore — handled when the file is read */
                }
                return { f, mtime };
            })
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, MAX_FILES);

        for (const { f } of files) {
            try {
                if (fs.statSync(f).size > MAX_FILE_BYTES) continue;
                const text = fs.readFileSync(f, "utf8");
                fileCount++;
                const origin = originOf(f, root);
                for (const line of text.split("\n")) {
                    if (!line) continue;
                    let obj: any;
                    try {
                        obj = JSON.parse(line);
                    } catch {
                        continue;
                    }
                    for (const ev of eventsFromLine(obj, origin)) events.push(ev);
                }
            } catch (e) {
                errors.push(`read ${f}: ${(e as Error).message}`);
            }
        }
    }

    events.sort((a, b) => a.ts - b.ts);

    const result: ActivityResult = {
        events,
        fileCount,
        scannedAt: new Date().toISOString(),
        errors,
        durationMs: Date.now() - started,
    };
    cache = { result, at: Date.now() };
    return result;
}
