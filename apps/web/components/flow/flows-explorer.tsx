"use client";

import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import { useFlowsList, useSeedFlows } from "./use-flow-queries";

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
                <div className="rounded-sm border border-dashed p-10 text-center">
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
                            <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
                                <CardContent className="flex flex-col gap-2 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-medium leading-snug">{flow.name}</span>
                                        {flow.seeded && (
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0 text-[10px]"
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
                                    <p className="tabular-nums text-xs text-muted-foreground">
                                        {flow.steps.length} step
                                        {flow.steps.length !== 1 ? "s" : ""}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
