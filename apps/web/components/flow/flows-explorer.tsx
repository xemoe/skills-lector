"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpDown, Play, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { IconSelectTrigger } from "@/components/icon-select-trigger";
import { useT } from "@/lib/i18n/context";
import {
    buildFlowQuery,
    filterSortFlows,
    parseFlowFilters,
    type FlowFilters,
    type FlowSortKey,
} from "@/lib/flow-filter";
import { useFlowsList, useSeedFlows } from "./use-flow-queries";

const SEARCH_DEBOUNCE_MS = 250;
const RAIL_MAX = 5;

/** Compact pipeline preview: a Start cap then up to RAIL_MAX numbered stage
 *  pips joined by connectors, with a "+N" overflow marker. */
function MiniRail({ count }: { count: number }) {
    const shown = Math.min(count, RAIL_MAX);
    return (
        <div className="flex items-center gap-1 overflow-hidden">
            <span className="flex size-4 shrink-0 items-center justify-center bg-primary/15 text-primary">
                <Play className="size-2 fill-current" />
            </span>
            {Array.from({ length: shown }).map((_, i) => (
                <Fragment key={i}>
                    <span className="h-px w-2.5 shrink-0 bg-border" />
                    <span className="flex size-4 shrink-0 items-center justify-center border bg-card font-mono text-[9px] tabular-nums text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-foreground">
                        {i + 1}
                    </span>
                </Fragment>
            ))}
            {count > shown && (
                <span className="ml-1 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    +{count - shown}
                </span>
            )}
        </div>
    );
}

export function FlowsExplorer() {
    const t = useT();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filters = useMemo(() => parseFlowFilters(searchParams), [searchParams]);

    const { data } = useFlowsList();
    const flows = useMemo(() => data?.flows ?? [], [data]);
    const seed = useSeedFlows();

    // URL is the source of truth; replace (not push) so filter tweaks don't
    // flood history.
    const update = useCallback(
        (patch: Partial<FlowFilters>) => {
            const qs = buildFlowQuery({ ...filters, ...patch });
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [filters, pathname, router],
    );

    // Local mirror for snappy typing; debounced into the URL.
    const [queryInput, setQueryInput] = useState(filters.query);
    useEffect(() => setQueryInput(filters.query), [filters.query]);
    useEffect(() => {
        if (queryInput === filters.query) return;
        const id = setTimeout(() => update({ query: queryInput }), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [queryInput, filters.query, update]);

    const filtered = useMemo(() => filterSortFlows(flows, filters), [flows, filters]);

    const sortLabel: Record<FlowSortKey, string> = {
        recent: t.flowsPage.sortRecent,
        name: t.flowsPage.sortName,
        steps: t.flowsPage.sortSteps,
    };

    // Detail links carry the live filters so the detail view's back/prev/next
    // operate on the same filtered, ordered list.
    const baseQuery = buildFlowQuery(filters);
    const detailHref = (id: number) => (baseQuery ? `/flows/${id}?${baseQuery}` : `/flows/${id}`);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.flowsPage.search}
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select
                    value={filters.sort}
                    onValueChange={(v) => update({ sort: v as FlowSortKey })}
                >
                    <IconSelectTrigger
                        icon={<ArrowUpDown />}
                        label={t.explorer.sortBy}
                        currentValue={sortLabel[filters.sort]}
                    />
                    <SelectContent position="popper">
                        <SelectItem value="recent">{t.flowsPage.sortRecent}</SelectItem>
                        <SelectItem value="name">{t.flowsPage.sortName}</SelectItem>
                        <SelectItem value="steps">{t.flowsPage.sortSteps}</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 lg:ml-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={seed.isPending}
                        onClick={() => seed.mutate()}
                        className="gap-1.5"
                    >
                        <Sparkles />
                        {seed.isPending ? t.flowsPage.seeding : t.flowsPage.seed}
                    </Button>
                    <Button asChild size="sm" className="gap-1.5">
                        <Link href="/flows/new">
                            <Plus />
                            {t.flowsPage.newFlow}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Empty / no-match / grid */}
            {flows.length === 0 ? (
                <div className="flow-canvas rounded-none border border-dashed p-12 text-center">
                    <p className="text-sm font-medium text-foreground">{t.flowsPage.emptyTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t.flowsPage.empty1}
                        <strong>{t.flowsPage.newFlow}</strong>
                        {t.flowsPage.empty2}
                        <strong>{t.flowsPage.seed}</strong>
                        {t.flowsPage.empty3}
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-none border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {t.flowsPage.noMatch}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((flow) => (
                        <Link key={flow.id} href={detailHref(flow.id)} className="group block">
                            <article className="flex h-full flex-col gap-3 rounded-none border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm font-semibold leading-snug text-foreground">
                                        {flow.name}
                                    </h3>
                                    {flow.seeded && (
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 font-mono text-[9px] uppercase tracking-wider"
                                        >
                                            {t.flowsPage.seededBadge}
                                        </Badge>
                                    )}
                                </div>

                                {flow.description && (
                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {flow.description}
                                    </p>
                                )}

                                <div className="mt-auto border-t pt-3">
                                    <MiniRail count={flow.steps.length} />
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">
                                            {flow.steps.length} {t.flowsPage.steps}
                                        </span>
                                        <ArrowRight className="size-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}

            {/* Count */}
            {flows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    {t.flowsPage.matchCount(filtered.length, flows.length)}
                </p>
            )}
        </div>
    );
}
