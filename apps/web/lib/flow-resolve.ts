// Pure, framework-agnostic resolver for Flow steps.
// Shared between FlowEditor (display) and buildCombinedPrompt (copy).
// No React, no Next — safe to import from any client or server module.

import type {
    Cheat,
    Flow,
    FlowEnhancedStep,
    FlowVariantKey,
} from "@lector/presets/types";

/** A resolved step pairs the stored cheat id with the live Cheat object.
 *  `cheat` is null when the cheat has since been removed (deleted/reimported). */
export type ResolvedStep = { cheatId: number; cheat: Cheat | null };

/** Map each step id to its Cheat (or null when the cheat no longer exists). */
export function resolveSteps(
    flow: Flow,
    cheatsById: Map<number, Cheat>,
): ResolvedStep[] {
    return flow.steps.map((cheatId) => ({
        cheatId,
        cheat: cheatsById.get(cheatId) ?? null,
    }));
}

/** Index a flow's stored enhancement steps by cheatId for O(1) per-step lookup. */
export function enhancedByCheatId(flow: Flow): Map<number, FlowEnhancedStep> {
    const map = new Map<number, FlowEnhancedStep>();
    for (const s of flow.enhanced?.steps ?? []) map.set(s.cheatId, s);
    return map;
}

/**
 * Build a numbered combined prompt for the flow.
 *
 * Format:
 *   # <flow name>
 *
 *   ## Step N — <intent | "Step N">
 *   <body>
 *
 * Each step's body is its enhanced rewrite at the requested `variant` length
 * when the step has been enhanced, else the raw cheat (`improved ?? original`).
 * Removed cheats (cheat === null) are skipped. Remaining steps are numbered
 * sequentially (gap-free). Blocks are joined by a blank line ("\n\n").
 */
export function buildCombinedPrompt(
    flow: Flow,
    cheatsById: Map<number, Cheat>,
    variant: FlowVariantKey = "short",
): string {
    const resolved = resolveSteps(flow, cheatsById);
    const enhanced = enhancedByCheatId(flow);

    const stepBlocks: string[] = [];
    let stepNumber = 0;

    for (const { cheatId, cheat } of resolved) {
        if (cheat === null) continue;
        stepNumber += 1;
        const label = cheat.intent ?? `Step ${stepNumber}`;
        const header = `## Step ${stepNumber} — ${label}`;
        const enh = enhanced.get(cheatId);
        const body = enh ? enh.variants[variant] : (cheat.improved ?? cheat.original);
        stepBlocks.push(`${header}\n${body}`);
    }

    return [`# ${flow.name}`, ...stepBlocks].join("\n\n");
}

/** Build a Map<id, Cheat> from a flat cheat array for O(1) step lookups. */
export function cheatsByIdMap(cheats: Cheat[]): Map<number, Cheat> {
    const map = new Map<number, Cheat>();
    for (const cheat of cheats) {
        map.set(cheat.id, cheat);
    }
    return map;
}
