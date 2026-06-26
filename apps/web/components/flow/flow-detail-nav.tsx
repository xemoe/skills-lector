"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/context";
import { useFlowsList } from "./use-flow-queries";
import {
    buildFlowQuery,
    filterSortFlows,
    parseFlowFilters,
} from "@/lib/flow-filter";

/**
 * Back-to-list + prev/next bar for the flow detail page. Reads the same URL
 * filters and the same cached flows list the explorer uses, so navigation walks
 * the identical filtered, ordered set. Neighbours fall back to disabled while
 * the list is still loading (e.g. a cold direct hit on /flows/12).
 */
export function FlowDetailNav({ flowId }: { flowId: number }) {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filters = parseFlowFilters(searchParams);

    const { data, isLoading } = useFlowsList();
    const flows = data?.flows ?? [];
    const ordered = filterSortFlows(flows, filters);
    const index = ordered.findIndex((f) => f.id === flowId);

    const qs = buildFlowQuery(filters);
    const backHref = qs ? `/flows?${qs}` : "/flows";
    const neighborHref = (id: number) =>
        qs ? `/flows/${id}?${qs}` : `/flows/${id}`;

    const prev = index > 0 ? ordered[index - 1] : null;
    const next =
        index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

    return (
        <div
            className="flex items-center justify-between gap-2"
            aria-busy={isLoading}
        >
            <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
                <Link href={backHref}>
                    <ArrowLeft className="h-4 w-4" />
                    {t.flowsPage.backToList}
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                {index >= 0 && ordered.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {t.flowsPage.itemPosition(index + 1, ordered.length)}
                    </span>
                )}
                {prev ? (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-l-md w-20"
                    >
                        <Link href={neighborHref(prev.id)}>
                            <ChevronLeft className="h-4 w-4" />
                            {t.actions.previous}
                        </Link>
                    </Button>
                ) : (
                    <Button
                        className="rounded-l-md w-20"
                        variant="outline"
                        size="sm"
                        disabled
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {t.actions.previous}
                    </Button>
                )}
                {index >= 0 && ordered.length > 0 && (
                    <Select
                        value={String(flowId)}
                        onValueChange={(id) =>
                            router.push(neighborHref(Number(id)))
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label={t.flowsPage.switchFlow}
                            className="min-w-32 max-w-56 rounded-md"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ordered.map((f) => (
                                <SelectItem key={f.id} value={String(f.id)}>
                                    {f.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {next ? (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-r-md w-20"
                    >
                        <Link href={neighborHref(next.id)}>
                            {t.actions.next}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-r-md w-20"
                        disabled
                    >
                        {t.actions.next}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
