"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Play, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/context";
import { useFlowsList, useSeedFlows } from "./use-flow-queries";

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
    const { data } = useFlowsList();
    const flows = data?.flows ?? [];
    const seed = useSeedFlows();

    return (
        <div className="space-y-4">
            {/* Header actions */}
            <div className="flex items-center justify-end gap-2">
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

            {/* Empty state */}
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
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {flows.map((flow) => (
                        <Link key={flow.id} href={`/flows/${flow.id}`} className="group block">
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

                                {/* Pipeline preview rail */}
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
        </div>
    );
}
