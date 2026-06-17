import { type NextRequest, NextResponse } from "next/server";
import { setFavorite } from "@lector/presets/cheats";

export const dynamic = "force-dynamic";

/** POST /api/cheats/:id/favorite  body: { favorite: boolean } — toggles the pin. */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const cheatId = Number(id);
    if (!Number.isInteger(cheatId) || cheatId <= 0) {
        return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    let body: { favorite?: unknown };
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const on = body?.favorite === true;
    try {
        const cheat = setFavorite(cheatId, on);
        if (!cheat) return NextResponse.json({ error: "not found" }, { status: 404 });
        return NextResponse.json(cheat, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error("[cheats/favorite] setFavorite failed", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
