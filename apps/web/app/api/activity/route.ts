import { type NextRequest, NextResponse } from "next/server";
import { buildAnalytics, parseOriginParam } from "@/lib/analytics";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity — returns usage analytics as JSON. Pass ?force=1 to bypass
 * the cache and ?origin=main|subagent|workflow to filter by execution origin.
 */
export function GET(request: NextRequest) {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const origin = parseOriginParam(request.nextUrl.searchParams.get("origin"));
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : undefined;
    const analytics = buildAnalytics({ force, locale, origin });
    return NextResponse.json(analytics, {
        headers: { "Cache-Control": "no-store" },
    });
}
