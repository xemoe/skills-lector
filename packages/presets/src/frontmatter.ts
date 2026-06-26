// packages/presets/src/frontmatter.ts
//
// Self-contained YAML frontmatter read/write for the preset apply path. Core's
// packages/core/src/frontmatter.ts only parses (no stringify), and the two
// packages are deliberately decoupled (no shared path alias), so this keeps a
// tiny local helper rather than coupling presets to core.

import yaml from "js-yaml";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { InvocationState } from "./types.js";

// Opening fence + body up to a closing `---` on its own line. The optional
// newline before the closing fence lets an empty block (`---\n---`) match too.
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n?---[ \t]*\r?\n?/;

/** Splits frontmatter YAML (as an object) from the markdown body. */
function parseFrontmatter(src: string): { data: Record<string, unknown>; content: string } {
    const match = src.match(FRONTMATTER_RE);
    if (!match) return { data: {}, content: src };
    const loaded = yaml.load(match[1]);
    const data =
        loaded && typeof loaded === "object" && !Array.isArray(loaded)
            ? (loaded as Record<string, unknown>)
            : {};
    return { data, content: src.slice(match[0].length) };
}

/** Re-emits `---\n<yaml>---\n<body>`, ensuring the file ends with a newline. */
function stringifyFrontmatter(content: string, data: Record<string, unknown>): string {
    const block = yaml.dump(data);
    const body = content.endsWith("\n") || content === "" ? content : content + "\n";
    return `---\n${block}---\n${body}`;
}

/**
 * Read the disable-model-invocation flag from a file's frontmatter.
 * Returns "disabled" if the flag is truthy, "enabled" otherwise (including missing key).
 * Throws if the file is unreadable or the frontmatter cannot be parsed at all.
 */
export function readInvocation(filePath: string): InvocationState {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(src);
    const flag = parsed.data["disable-model-invocation"];
    return flag === true ? "disabled" : "enabled";
}

/**
 * Atomically write the disable-model-invocation flag to a file's frontmatter.
 * - to "enabled":   removes the key entirely (cleaner than setting to false)
 * - to "disabled":  sets the key to true
 * Uses temp-file + rename for atomicity. exFAT supports rename for files
 * (it's symlinks that fail).
 */
export function writeInvocation(filePath: string, state: InvocationState): void {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(src);
    const data = { ...parsed.data };
    if (state === "disabled") {
        data["disable-model-invocation"] = true;
    } else {
        delete data["disable-model-invocation"];
    }
    const out = stringifyFrontmatter(parsed.content, data);
    const tmp = filePath + ".tmp-preset-" + process.pid + "-" + Date.now();
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(tmp, out, "utf8");
    renameSync(tmp, filePath);
}
