// apps/web/app/api/flows/[id]/enhance/route.ts
// GET /api/flows/:id/enhance — the composition context for enhancing a flow:
// the flow's combined prompt + per-step bodies, plus the catalog of installed
// skills and commands (name/description/path) so a client or agent can rewrite
// each step folding in the relevant skill guidance. Read-only.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFlow, setFlowEnhanced } from "@lector/presets/flows";
import { listCheats } from "@lector/presets/cheats";
import { scanSkills } from "@lector/core/scanner";
import { scanCommands } from "@lector/core/command-scanner";
import {
    buildCombinedPrompt,
    cheatsByIdMap,
    resolveSteps,
} from "@/lib/flow-resolve";

export const dynamic = "force-dynamic";

function parseFlowId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

const EnhanceBody = z.object({
    steps: z
        .array(
            z.object({
                cheatId: z.number().int(),
                enhanced: z.string().min(1).max(20000),
                foldedIn: z.array(z.string().max(120)).max(20).default([]),
            }),
        )
        .min(1)
        .max(200),
});

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

    const flow = getFlow(id);
    if (!flow) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const byId = cheatsByIdMap(listCheats());

    // Gap-free, deleted-skipped step list — same numbering as buildCombinedPrompt.
    // cheatId is included so the POST can key each rewrite back to its step.
    const steps: {
        n: number;
        cheatId: number;
        intent: string | null;
        body: string;
    }[] = [];
    for (const { cheatId, cheat } of resolveSteps(flow, byId)) {
        if (cheat === null) continue;
        steps.push({
            n: steps.length + 1,
            cheatId,
            intent: cheat.intent,
            body: cheat.improved ?? cheat.original,
        });
    }

    const skills = scanSkills().skills.map((s) => ({
        name: s.name,
        description: s.description,
        path: s.skillMdPath,
        scope: s.type,
    }));
    const commands = scanCommands().commands.map((c) => ({
        name: c.name,
        description: c.description,
        path: c.path,
        scope: c.scope,
    }));

    return NextResponse.json(
        {
            flow: { id: flow.id, slug: flow.slug, name: flow.name },
            combinedPrompt: buildCombinedPrompt(flow, byId),
            steps,
            skills,
            commands,
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}

// POST /api/flows/:id/enhance — store the per-step skill-aware rewrite produced
// by the /skill-lector:flow-enhance command, so the flow detail page can render it.
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

    const body = await request.json().catch(() => null);
    const parsed = EnhanceBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }

    if (!getFlow(id)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const flow = setFlowEnhanced(id, parsed.data.steps);
    return NextResponse.json({ flow }, { headers: { "Cache-Control": "no-store" } });
}
