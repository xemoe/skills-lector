// apps/web/app/api/flows/seed/route.ts
import { NextResponse } from "next/server";
import { seedFlows } from "@lector/presets/flows";

export const dynamic = "force-dynamic";

export function POST(): NextResponse {
    try {
        const { created } = seedFlows();
        return NextResponse.json({ created });
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
