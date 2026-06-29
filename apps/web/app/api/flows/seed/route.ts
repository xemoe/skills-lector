// apps/web/app/api/flows/seed/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { seedFlows } from "@lector/presets/flows";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ project: z.string().min(1).optional() });

export async function POST(req: Request): Promise<NextResponse> {
    try {
        // Body is optional: no/empty body → global seed. A present-but-malformed
        // body is an error, not a silent fall-through to a global seed.
        const text = await req.text();
        let raw: unknown = {};
        if (text.trim()) {
            try {
                raw = JSON.parse(text);
            } catch {
                return NextResponse.json(
                    { error: "invalid", message: "body must be valid JSON" },
                    { status: 400 },
                );
            }
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "invalid", message: "project must be a non-empty string" },
                { status: 400 },
            );
        }
        const { created } = seedFlows({ project: parsed.data.project });
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
