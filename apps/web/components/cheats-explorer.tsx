"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Cheat } from "@lector/presets/types";

type SortKey = "recent" | "reuse" | "used";
type TabKey = "all" | "favorites";
type ViewMode = "table" | "cards";

const PAGE_SIZE = 10;

/** Cross-platform basename for display (client has no node:path). */
function basename(p: string): string {
    const segments = p.split(/[\\/]/);
    return segments[segments.length - 1] || p;
}

export function CheatsExplorer({ cheats }: { cheats: Cheat[] }) {
    const router = useRouter();
    const t = useT();
    const [query, setQuery] = useState("");
    const [tab, setTab] = useState<TabKey>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [intentFilter, setIntentFilter] = useState("all");
    const [sort, setSort] = useState<SortKey>("recent");
    const [page, setPage] = useState(1);
    const [view, setView] = useState<ViewMode>("table");
    const [favIds, setFavIds] = useState<Set<number>>(
        () => new Set(cheats.filter((c) => c.favorite).map((c) => c.id)),
    );

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

    const counts = useMemo(
        () => ({ all: cheats.length, favorites: favIds.size }),
        [cheats.length, favIds],
    );

    async function toggleFavorite(c: Cheat) {
        const on = !favIds.has(c.id);
        setFavIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(c.id);
            else next.delete(c.id);
            return next;
        });
        try {
            const res = await fetch(`/api/cheats/${c.id}/favorite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ favorite: on }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.refresh();
        } catch {
            // rollback on failure
            setFavIds((prev) => {
                const next = new Set(prev);
                if (on) next.delete(c.id);
                else next.add(c.id);
                return next;
            });
        }
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = cheats.filter((c) => {
            if (tab === "favorites" && !favIds.has(c.id)) return false;
            if (projectFilter !== "all" && c.project !== projectFilter) return false;
            if (intentFilter !== "all" && c.intent !== intentFilter) return false;
            if (!q) return true;
            return (
                c.original.toLowerCase().includes(q) ||
                (c.improved?.toLowerCase().includes(q) ?? false) ||
                (c.intent?.toLowerCase().includes(q) ?? false) ||
                c.tags.some((tag) => tag.toLowerCase().includes(q))
            );
        });
        return list.sort((a, b) => {
            if (sort === "reuse") return (b.reuseScore ?? -1) - (a.reuseScore ?? -1);
            if (sort === "used") return b.occurrences - a.occurrences;
            return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
        });
    }, [cheats, query, tab, projectFilter, intentFilter, sort, favIds]);

    const sortLabel: Record<SortKey, string> = {
        recent: t.cheatsPage.sortRecent,
        reuse: t.cheatsPage.sortReuse,
        used: t.cheatsPage.sortUsed,
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paged = useMemo(
        () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filtered, currentPage],
    );
    const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.cheatsPage.search}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        className="pl-8"
                    />
                </div>
                <Tabs
                    value={tab}
                    onValueChange={(v) => {
                        setTab(v as TabKey);
                        setPage(1);
                    }}
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
                        value={projectFilter}
                        onValueChange={(v) => {
                            setProjectFilter(v);
                            setPage(1);
                        }}
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
                        value={intentFilter}
                        onValueChange={(v) => {
                            setIntentFilter(v);
                            setPage(1);
                        }}
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
                    value={sort}
                    onValueChange={(v) => {
                        setSort(v as SortKey);
                        setPage(1);
                    }}
                >
                    <IconSelectTrigger
                        icon={<ArrowUpDown />}
                        label={t.explorer.sortBy}
                        currentValue={sortLabel[sort]}
                    />
                    <SelectContent position="popper">
                        <SelectItem value="recent">{t.cheatsPage.sortRecent}</SelectItem>
                        <SelectItem value="reuse">{t.cheatsPage.sortReuse}</SelectItem>
                        <SelectItem value="used">{t.cheatsPage.sortUsed}</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center self-start rounded-md border lg:ml-auto lg:self-auto">
                    <Button
                        type="button"
                        variant={view === "table" ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t.cheatsPage.viewTable}
                        aria-pressed={view === "table"}
                        title={t.cheatsPage.viewTable}
                        onClick={() => setView("table")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant={view === "cards" ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t.cheatsPage.viewCards}
                        aria-pressed={view === "cards"}
                        title={t.cheatsPage.viewCards}
                        onClick={() => setView("cards")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {view === "table" ? (
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
                                const isFav = favIds.has(c.id);
                                return (
                                    <TableRow
                                        key={c.id}
                                        className="cursor-pointer hover:bg-accent"
                                        onClick={() => router.push(`/cheats/${c.id}`)}
                                    >
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title={isFav ? t.cheatsPage.unfavorite : t.cheatsPage.favorite}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void toggleFavorite(c);
                                                }}
                                            >
                                                <Star
                                                    className={cn(
                                                        "h-4 w-4",
                                                        isFav ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground",
                                                    )}
                                                />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="max-w-[420px]">
                                            <Link
                                                href={`/cheats/${c.id}`}
                                                className="line-clamp-2 block text-sm hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {c.improved ?? c.original}
                                            </Link>
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
                                            <CopyButton value={c.improved ?? c.original} size="icon-xs" />
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
                        const isFav = favIds.has(c.id);
                        return (
                            <Card
                                key={c.id}
                                className="group flex cursor-pointer flex-col rounded-sm transition-colors hover:bg-accent"
                                onClick={() => router.push(`/cheats/${c.id}`)}
                            >
                                <CardContent className="flex h-full flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
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
                                        <div
                                            className="-mr-1.5 flex items-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title={
                                                    isFav
                                                        ? t.cheatsPage.unfavorite
                                                        : t.cheatsPage.favorite
                                                }
                                                onClick={() => void toggleFavorite(c)}
                                            >
                                                <Star
                                                    className={cn(
                                                        "h-4 w-4",
                                                        isFav
                                                            ? "fill-yellow-400 text-yellow-500"
                                                            : "text-muted-foreground",
                                                    )}
                                                />
                                            </Button>
                                            <CopyButton
                                                value={c.improved ?? c.original}
                                                size="icon-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="line-clamp-4 flex-1 text-sm">
                                        {c.improved ?? c.original}
                                    </p>
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
                            onClick={() => setPage(currentPage - 1)}
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
                            onClick={() => setPage(currentPage + 1)}
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
