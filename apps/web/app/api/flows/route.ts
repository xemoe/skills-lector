// apps/web/app/api/flows/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createFlow, listFlows, SlugCollisionError } from "@lector/presets/flows";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
    slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(120),
    description: z.string().max(500).nullable().optional(),
});

export function GET(): NextResponse {
    const flows = listFlows();
    return NextResponse.json({ flows });
}

export async function POST(request: Request): Promise<NextResponse> {
    const body = await request.json().catch(() => null);
    const parsed = CreateBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    try {
        const flow = createFlow(parsed.data);
        return NextResponse.json({ flow }, { status: 201 });
    } catch (err) {
        if (err instanceof SlugCollisionError) {
            return NextResponse.json(
                { error: "slug_collision", slug: parsed.data.slug },
                { status: 409 },
            );
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
