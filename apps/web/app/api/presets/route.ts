// apps/web/app/api/presets/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import {
    createPreset,
    getActiveState,
    listPresets,
    SlugCollisionError,
} from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
    slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(120),
    description: z.string().max(500).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
});

const ListQuery = z.object({
    status: z.enum(["active", "archived", "all"]).optional(),
});

export function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = ListQuery.safeParse({
        status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_query", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    const presets = listPresets({ status: parsed.data.status });
    const active = getActiveState();
    return NextResponse.json({ presets, active });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = CreateBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    try {
        const preset = createPreset(parsed.data);
        return NextResponse.json({ preset }, { status: 201 });
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
