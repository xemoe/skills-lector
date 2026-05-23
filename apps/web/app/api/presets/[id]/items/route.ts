// apps/web/app/api/presets/[id]/items/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { addItem, getPreset, removeItem } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const ItemBody = z.object({
    kind: z.enum(["skill", "command"]),
    identifier: z.string().min(1).max(256),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const body = await request.json().catch(() => null);
    const parsed = ItemBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const item = addItem(id, parsed.data.kind, parsed.data.identifier);
        return NextResponse.json({ item }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const url = new URL(request.url);
    const parsed = ItemBody.safeParse({
        kind: url.searchParams.get("kind"),
        identifier: url.searchParams.get("identifier"),
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        removeItem(id, parsed.data.kind, parsed.data.identifier);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
