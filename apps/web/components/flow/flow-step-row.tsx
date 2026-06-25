"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import type { ResolvedStep } from "@/lib/flow-resolve";

const PREVIEW_MAX = 120;

function truncate(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX).trimEnd()}…` : flat;
}

interface FlowStepRowProps {
    step: ResolvedStep;
    index: number;
    total: number;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
}

/**
 * Renders one step in a flow editor list.
 *
 * When `step.cheat` is null (the cheat has been removed/reimported away), the
 * row degrades to a muted "removed" placeholder with only the remove control.
 */
export function FlowStepRow({
    step,
    index,
    total,
    onMoveUp,
    onMoveDown,
    onRemove,
}: FlowStepRowProps) {
    const { cheat, cheatId } = step;

    if (cheat === null) {
        return (
            <div className="flex items-center gap-2 rounded-sm border border-dashed px-3 py-2">
                <Badge variant="outline" className="shrink-0 tabular-nums text-[10px]">
                    {index + 1}
                </Badge>
                <span className="flex-1 text-xs italic text-muted-foreground">
                    removed cheat #{cheatId}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove step"
                    onClick={() => onRemove(index)}
                >
                    <X />
                </Button>
            </div>
        );
    }

    const promptText = cheat.improved ?? cheat.original;

    return (
        <div className="flex items-start gap-2 rounded-sm border bg-card px-3 py-2">
            <Badge
                variant="secondary"
                className="mt-0.5 shrink-0 tabular-nums text-[10px]"
            >
                {index + 1}
            </Badge>

            <div className="min-w-0 flex-1">
                {cheat.intent && (
                    <p className="mb-0.5 font-mono text-xs font-medium text-foreground">
                        {cheat.intent}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">{truncate(promptText)}</p>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                >
                    <ChevronUp />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move down"
                    disabled={index === total - 1}
                    onClick={() => onMoveDown(index)}
                >
                    <ChevronDown />
                </Button>
                <CopyButton value={promptText} size="icon-xs" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove step"
                    onClick={() => onRemove(index)}
                >
                    <X />
                </Button>
                <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Open cheat #${cheatId}`}
                >
                    <Link href={`/cheats/${cheatId}`} tabIndex={-1}>
                        <span aria-hidden="true" className="text-[10px]">↗</span>
                    </Link>
                </Button>
            </div>
        </div>
    );
}
