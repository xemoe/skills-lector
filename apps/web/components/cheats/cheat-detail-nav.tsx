"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { useCheatsList } from "@/components/cheats/use-cheat-queries";
import {
    PAGE_SIZE,
    buildCheatQuery,
    filterSortCheats,
    pageOfIndex,
    parseCheatFilters,
} from "@/lib/cheats-filter";

/**
 * Back-to-list + prev/next bar for the cheat detail page. Reads the same URL
 * filters and the same cached cheats list the explorer uses, so navigation
 * walks the identical filtered, ordered set. Neighbours fall back to disabled
 * while the list is still loading (e.g. a cold direct hit on /cheats/123).
 */
export function CheatDetailNav({ cheatId }: { cheatId: number }) {
    const t = useT();
    const searchParams = useSearchParams();
    const filters = parseCheatFilters(searchParams);

    const { data, isLoading } = useCheatsList();
    const cheats = data?.cheats ?? [];
    const ordered = filterSortCheats(cheats, filters);
    const index = ordered.findIndex((c) => c.id === cheatId);

    // Clamp the page fallback (used when the item isn't in the filtered set) to
    // the real range so a stale URL page doesn't leak into the back link.
    const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
    const fallbackPage = Math.min(filters.page, totalPages);

    const backQuery = buildCheatQuery({
        ...filters,
        page: pageOfIndex(index, fallbackPage),
    });
    const backHref = backQuery ? `/cheats?${backQuery}` : "/cheats";

    const prev = index > 0 ? ordered[index - 1] : null;
    const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

    const neighborHref = (id: number, idx: number) => {
        const qs = buildCheatQuery({ ...filters, page: pageOfIndex(idx, fallbackPage) });
        return qs ? `/cheats/${id}?${qs}` : `/cheats/${id}`;
    };

    return (
        <div className="flex items-center justify-between gap-2" aria-busy={isLoading}>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
                <Link href={backHref}>
                    <ArrowLeft className="h-4 w-4" />
                    {t.cheatsPage.backToList}
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                {index >= 0 && ordered.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {t.cheatsPage.itemPosition(index + 1, ordered.length)}
                    </span>
                )}
                {prev ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href={neighborHref(prev.id, index - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                            {t.actions.previous}
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                        {t.actions.previous}
                    </Button>
                )}
                {next ? (
                    <Button asChild variant="outline" size="sm">
                        <Link href={neighborHref(next.id, index + 1)}>
                            {t.actions.next}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        {t.actions.next}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
