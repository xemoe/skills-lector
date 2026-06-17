"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Gauge,
    LayoutGrid,
    List,
    Repeat2,
    Search,
    ShieldCheck,
    Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconSelectTrigger } from "@/components/icon-select-trigger";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/count-badge";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { useCheatsList, useToggleFavorite } from "@/components/cheats/use-cheat-queries";
import {
    PAGE_SIZE,
    buildCheatQuery,
    displayedPrompt,
    filterSortCheats,
    parseCheatFilters,
    type CheatFilters,
    type SortKey,
} from "@/lib/cheats-filter";

/** Cross-platform basename for display (client has no node:path). */
function basename(p: string): string {
    const segments = p.split(/[\\/]/);
    return segments[segments.length - 1] || p;
}

const SEARCH_DEBOUNCE_MS = 250;

export function CheatsExplorer() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useT();

    const filters = useMemo(() => parseCheatFilters(searchParams), [searchParams]);

    const { data } = useCheatsList();
    const cheats = useMemo(() => data?.cheats ?? [], [data]);
    const toggleFav = useToggleFavorite();

    // URL is the single source of truth for filters. Replace (not push) so
    // tweaking filters doesn't flood browser history.
    const pushFilters = useCallback(
        (next: CheatFilters) => {
            const qs = buildCheatQuery(next);
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname],
    );

    // Merge a partial update; count/order-affecting changes reset to page 1.
    const update = useCallback(
        (patch: Partial<CheatFilters>, resetPage = true) => {
            pushFilters({
                ...filters,
                ...patch,
                page: resetPage ? 1 : (patch.page ?? filters.page),
            });
        },
        [filters, pushFilters],
    );

    // Page turns reset scroll to the top so the new page starts in view.
    const goToPage = useCallback(
        (page: number) => {
            update({ page }, false);
            if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },
        [update],
    );

    // Local mirror for the search box (snappy typing); debounced into the URL.
    const [queryInput, setQueryInput] = useState(filters.query);
    useEffect(() => {
        setQueryInput(filters.query);
    }, [filters.query]);
    useEffect(() => {
        if (queryInput === filters.query) return;
        const id = setTimeout(() => update({ query: queryInput }), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [queryInput, filters.query, update]);

    const projects = useMemo(() => {
        const set = new Set<string>();
        for (const c of cheats) if (c.project) set.add(c.project);
        return [...set].sort();
    }, [cheats]);

    const intents = useMemo(() => {
        const set = new Set<string>();
        for (const c of cheats) if (c.intent) set.add(c.intent);
        return [...set].sort();
    }, [cheats]);

    // Only worth offering the filter when the library actually mixes the two.
    const hasLegacy = useMemo(() => cheats.some((c) => c.provenance !== "typed"), [cheats]);
    // The original/improved toggle is pointless if nothing has an improved version.
    const hasImproved = useMemo(() => cheats.some((c) => c.improved), [cheats]);

    const counts = useMemo(
        () => ({ all: cheats.length, favorites: cheats.filter((c) => c.favorite).length }),
        [cheats],
    );

    const filtered = useMemo(() => filterSortCheats(cheats, filters), [cheats, filters]);

    const sortLabel: Record<SortKey, string> = {
        recent: t.cheatsPage.sortRecent,
        reuse: t.cheatsPage.sortReuse,
        used: t.cheatsPage.sortUsed,
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(filters.page, totalPages);
    const paged = useMemo(
        () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filtered, currentPage],
    );
    const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

    // Detail links carry the live filters (incl. the page actually shown) so the
    // detail view's back/prev/next operate on the same filtered, ordered list.
    const baseQuery = useMemo(
        () => buildCheatQuery({ ...filters, page: currentPage }),
        [filters, currentPage],
    );
    const detailHref = useCallback(
        (id: number) => (baseQuery ? `/cheats/${id}?${baseQuery}` : `/cheats/${id}`),
        [baseQuery],
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.cheatsPage.search}
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Tabs
                    value={filters.tab}
                    onValueChange={(v) => update({ tab: v as CheatFilters["tab"] })}
                >
                    <TabsList>
                        <TabsTrigger value="all" className="gap-1.5">
                            {t.cheatsPage.tabAll}
                            <CountBadge>{counts.all}</CountBadge>
                        </TabsTrigger>
                        <TabsTrigger value="favorites" className="gap-1.5">
                            {t.cheatsPage.tabFavorites}
                            <CountBadge>{counts.favorites}</CountBadge>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                {projects.length > 0 && (
                    <Select
                        value={filters.project}
                        onValueChange={(v) => update({ project: v })}
                    >
                        <SelectTrigger className="gap-1.5 lg:w-[200px]" aria-label={t.cheatsPage.filterProject}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.cheatsPage.allProjects}</SelectItem>
                            {projects.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {basename(p)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {intents.length > 0 && (
                    <Select
                        value={filters.intent}
                        onValueChange={(v) => update({ intent: v })}
                    >
                        <SelectTrigger className="gap-1.5 lg:w-[180px]" aria-label={t.cheatsPage.filterIntent}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.cheatsPage.allIntents}</SelectItem>
                            {intents.map((i) => (
                                <SelectItem key={i} value={i}>
                                    {i}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select
                    value={filters.sort}
                    onValueChange={(v) => update({ sort: v as SortKey })}
                >
                    <IconSelectTrigger
                        icon={<ArrowUpDown />}
                        label={t.explorer.sortBy}
                        currentValue={sortLabel[filters.sort]}
                    />
                    <SelectContent position="popper">
                        <SelectItem value="recent">{t.cheatsPage.sortRecent}</SelectItem>
                        <SelectItem value="reuse">{t.cheatsPage.sortReuse}</SelectItem>
                        <SelectItem value="used">{t.cheatsPage.sortUsed}</SelectItem>
                    </SelectContent>
                </Select>
                {hasImproved && (
                    <div
                        className="flex items-center self-start rounded-md border lg:self-auto"
                        role="radiogroup"
                        aria-label={t.cheatsPage.displayModeLabel}
                    >
                        <Button
                            type="button"
                            role="radio"
                            variant={filters.show === "original" ? "secondary" : "ghost"}
                            size="sm"
                            aria-checked={filters.show === "original"}
                            onClick={() => update({ show: "original" }, false)}
                        >
                            {t.cheatsPage.showOriginal}
                        </Button>
                        <Button
                            type="button"
                            role="radio"
                            variant={filters.show === "improved" ? "secondary" : "ghost"}
                            size="sm"
                            aria-checked={filters.show === "improved"}
                            onClick={() => update({ show: "improved" }, false)}
                        >
                            {t.cheatsPage.showImproved}
                        </Button>
                    </div>
                )}
                {hasLegacy && (
                    <Button
                        type="button"
                        variant={filters.typedOnly ? "secondary" : "outline"}
                        size="sm"
                        className="gap-1.5 self-start lg:ml-auto lg:self-auto"
                        aria-pressed={filters.typedOnly}
                        title={t.cheatsPage.typedOnlyHint}
                        onClick={() => update({ typedOnly: !filters.typedOnly })}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        {t.cheatsPage.typedOnly}
                    </Button>
                )}
                <div
                    className={cn(
                        "flex items-center self-start rounded-md border lg:self-auto",
                        !hasLegacy && "lg:ml-auto",
                    )}
                    role="radiogroup"
                    aria-label={t.cheatsPage.viewModeLabel}
                >
                    <Button
                        type="button"
                        role="radio"
                        variant={filters.view === "table" ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t.cheatsPage.viewTable}
                        aria-checked={filters.view === "table"}
                        title={t.cheatsPage.viewTable}
                        onClick={() => update({ view: "table" }, false)}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        role="radio"
                        variant={filters.view === "cards" ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t.cheatsPage.viewCards}
                        aria-checked={filters.view === "cards"}
                        title={t.cheatsPage.viewCards}
                        onClick={() => update({ view: "cards" }, false)}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {filters.view === "table" ? (
                <div className="ring-1 ring-foreground/10">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[44px]" />
                            <TableHead className="min-w-[320px]">{t.cheatsPage.colPrompt}</TableHead>
                            <TableHead className="w-[120px]">{t.cheatsPage.colIntent}</TableHead>
                            <TableHead className="w-[140px]">{t.cheatsPage.colProject}</TableHead>
                            <TableHead className="w-[80px] text-center">{t.cheatsPage.colReuse}</TableHead>
                            <TableHead className="w-[70px] text-center">{t.cheatsPage.colUsed}</TableHead>
                            <TableHead className="w-[130px]">{t.cheatsPage.colUpdated}</TableHead>
                            <TableHead className="w-[44px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    {t.cheatsPage.noMatch}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paged.map((c) => {
                                const isFav = c.favorite;
                                const text = displayedPrompt(c, filters.show);
                                return (
                                    <TableRow
                                        key={c.id}
                                        className="cursor-pointer hover:bg-accent"
                                        onClick={() => router.push(detailHref(c.id))}
                                    >
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={isFav ? t.cheatsPage.unfavorite : t.cheatsPage.favorite}
                                                title={isFav ? t.cheatsPage.unfavorite : t.cheatsPage.favorite}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFav.mutate({ id: c.id, favorite: !isFav });
                                                }}
                                            >
                                                <Star
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "h-4 w-4",
                                                        isFav ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground",
                                                    )}
                                                />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="max-w-[420px]">
                                            <Link
                                                href={detailHref(c.id)}
                                                className="line-clamp-2 block text-sm hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {text}
                                            </Link>
                                            {c.provenance !== "typed" && (
                                                <Badge
                                                    variant="outline"
                                                    className="mt-1 text-[10px] font-normal text-muted-foreground"
                                                    title={t.cheatsPage.provenanceLegacyHint}
                                                >
                                                    {t.cheatsPage.provenanceLegacy}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {c.intent ? (
                                                <span className="font-mono text-xs">{c.intent}</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            {c.project ? (
                                                <span
                                                    className="block truncate font-mono text-xs text-muted-foreground"
                                                    title={c.project}
                                                >
                                                    {basename(c.project)}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums text-sm">
                                            {c.reuseScore ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                                            {c.occurrences}
                                        </TableCell>
                                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                                            {formatDate(c.lastSeenAt)}
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <CopyButton value={text} size="icon-xs" />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-sm border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {t.cheatsPage.noMatch}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {paged.map((c) => {
                        const isFav = c.favorite;
                        const text = displayedPrompt(c, filters.show);
                        return (
                            <Card
                                key={c.id}
                                className="group flex cursor-pointer flex-col rounded-sm transition-colors hover:bg-accent"
                                onClick={() => router.push(detailHref(c.id))}
                            >
                                <CardContent className="flex h-full flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {c.intent ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="font-mono text-[11px]"
                                                >
                                                    {c.intent}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                            {c.provenance !== "typed" && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-normal text-muted-foreground"
                                                    title={t.cheatsPage.provenanceLegacyHint}
                                                >
                                                    {t.cheatsPage.provenanceLegacy}
                                                </Badge>
                                            )}
                                        </div>
                                        <div
                                            className="-mr-1.5 flex items-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={
                                                    isFav
                                                        ? t.cheatsPage.unfavorite
                                                        : t.cheatsPage.favorite
                                                }
                                                title={
                                                    isFav
                                                        ? t.cheatsPage.unfavorite
                                                        : t.cheatsPage.favorite
                                                }
                                                onClick={() =>
                                                    toggleFav.mutate({ id: c.id, favorite: !isFav })
                                                }
                                            >
                                                <Star
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "h-4 w-4",
                                                        isFav
                                                            ? "fill-yellow-400 text-yellow-500"
                                                            : "text-muted-foreground",
                                                    )}
                                                />
                                            </Button>
                                            <CopyButton value={text} size="icon-sm" />
                                        </div>
                                    </div>
                                    <p className="line-clamp-4 flex-1 text-sm">{text}</p>
                                    {c.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {c.tags.slice(0, 4).map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-3 tabular-nums">
                                            <span
                                                className="inline-flex items-center gap-1"
                                                title={t.cheatsPage.reuseLabel}
                                            >
                                                <Gauge className="h-3 w-3" />
                                                {c.reuseScore ?? "—"}
                                            </span>
                                            <span
                                                className="inline-flex items-center gap-1"
                                                title={t.cheatsPage.occurrencesLabel}
                                            >
                                                <Repeat2 className="h-3 w-3" />
                                                {c.occurrences}
                                            </span>
                                        </span>
                                        {c.project && (
                                            <span
                                                className="truncate font-mono"
                                                title={c.project}
                                            >
                                                {basename(c.project)}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    {filtered.length > 0
                        ? t.cheatsPage.showing(rangeStart, rangeEnd, filtered.length)
                        : t.cheatsPage.emptyCount(cheats.length)}
                </p>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => goToPage(currentPage - 1)}
                        >
                            <ChevronLeft />
                            {t.actions.previous}
                        </Button>
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {t.common.page(currentPage, totalPages)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => goToPage(currentPage + 1)}
                        >
                            {t.actions.next}
                            <ChevronRight />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
