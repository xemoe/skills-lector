// apps/web/app/api/flows/[id]/steps/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { setFlowSteps } from "@lector/presets/flows";

export const dynamic = "force-dynamic";

const StepsBody = z.object({
    cheatIds: z.array(z.number().int().min(1)),
});

function parseFlowId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function isNotFoundError(err: unknown): boolean {
    return err instanceof Error && err.message.startsWith("Flow not found:");
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = StepsBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    try {
        const flow = setFlowSteps(id, parsed.data.cheatIds);
        return NextResponse.json({ flow });
    } catch (err) {
        if (isNotFoundError(err)) {
            return NextResponse.json({ error: "not_found" }, { status: 404 });
        }
        return NextResponse.json(
            {
                error: "internal",
                message: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
        );
    }
}
