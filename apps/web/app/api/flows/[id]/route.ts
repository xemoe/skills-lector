// apps/web/app/api/flows/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteFlow, getFlow, updateFlow } from "@lector/presets/flows";

export const dynamic = "force-dynamic";

const UpdateBody = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
});

function parseFlowId(raw: string): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function isNotFoundError(err: unknown): boolean {
    return err instanceof Error && err.message.startsWith("Flow not found:");
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const flow = getFlow(id);
    if (!flow) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ flow });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = UpdateBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    try {
        const flow = updateFlow(id, parsed.data);
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

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { id: idStr } = await params;
    const id = parseFlowId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const existing = getFlow(id);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
        deleteFlow(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            {
                error: "internal",
                message: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
        );
    }
}
