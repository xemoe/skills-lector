// apps/web/app/api/presets/[id]/archive/route.ts
import { NextResponse } from "next/server";
import { archivePreset, getPreset } from "@lector/presets/presets";
import { parsePresetId } from "@/lib/preset-query";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parsePresetId(idStr);
    if (!id) {
        return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const updated = archivePreset(id);
    return NextResponse.json({ preset: updated });
}
