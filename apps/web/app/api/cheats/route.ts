import { NextResponse } from "next/server";
import { listCheats } from "@lector/presets/cheats";

export const dynamic = "force-dynamic";

/** GET /api/cheats — returns every cheat as JSON. Read-only; reflects the DB on each call. */
export function GET() {
    const cheats = listCheats();
    return NextResponse.json({ cheats }, { headers: { "Cache-Control": "no-store" } });
}
