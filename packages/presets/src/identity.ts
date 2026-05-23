// packages/presets/src/identity.ts
import { homedir } from "node:os";
import { join } from "node:path";
import { scanSkills } from "@lector/core/scanner";
import { scanCommands } from "@lector/core/command-scanner";
import type { FsItem, ItemKind, InvocationState } from "./types";

function personalRoot(): string {
    const fromEnv = process.env.SKILLS_LECTOR_PERSONAL_ROOT;
    if (fromEnv && fromEnv.trim()) {
        return fromEnv.trim() === "~"
            ? homedir()
            : fromEnv.replace(/^~(?=[\\/])/, homedir());
    }
    return join(homedir(), ".claude");
}

/**
 * Resolve a preset_items.identifier back to the absolute filesystem path
 * under the personal scope. Returns the joined path (does not verify existence).
 *
 * Skill identifier "debug-mantra" → ~/.claude/skills/debug-mantra/SKILL.md
 * Command identifier "vendor-install" → ~/.claude/commands/vendor-install.md
 * Command identifier "git:commit" → ~/.claude/commands/git/commit.md
 */
export function resolveItemPath(
    kind: ItemKind,
    identifier: string,
): string {
    const root = personalRoot();
    if (kind === "skill") {
        return join(root, "skills", identifier, "SKILL.md");
    }
    // command: ":" becomes "/" for namespaced commands
    const rel = identifier.replace(/:/g, "/") + ".md";
    return join(root, "commands", rel);
}

/**
 * Scan personal-scope skills + commands and return a unified FsItem list.
 * Re-uses packages/core scanners; filters to personal scope.
 *
 * NOTE on field names (verified against packages/core/src/types.ts):
 *   Skill  — scope field is `type` (SkillType), file path is `skillMdPath`, id is `name`
 *   Command — scope field is `scope` (CommandScope), file path is `path`, id is `name`
 */
export function listPersonalItems(opts: { force?: boolean } = {}): FsItem[] {
    const items: FsItem[] = [];

    const skillResult = scanSkills({ force: opts.force });
    for (const s of skillResult.skills) {
        // Skill uses `type` (not `scope`) for its scope field
        if (s.type !== "personal") continue;
        const filePath = s.skillMdPath;
        if (!filePath) continue;
        items.push({
            kind: "skill",
            identifier: s.name,
            currentInvocation: invocationFromFlag(s.disableModelInvocation),
            filePath,
        });
    }

    const cmdResult = scanCommands({ force: opts.force });
    for (const c of cmdResult.commands) {
        // Command uses `scope` (CommandScope) for its scope field
        if (c.scope !== "personal") continue;
        const filePath = c.path;
        if (!filePath) continue;
        items.push({
            kind: "command",
            identifier: c.name, // command-scanner already namespaces with ":"
            currentInvocation: invocationFromFlag(c.disableModelInvocation),
            filePath,
        });
    }

    return items;
}

function invocationFromFlag(flag: unknown): InvocationState {
    return flag === true ? "disabled" : "enabled";
}
