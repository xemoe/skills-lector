"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import type { ResolvedStep } from "@/lib/flow-resolve";

const PREVIEW_MAX = 200;

function truncate(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX).trimEnd()}…` : flat;
}

interface FlowNodeProps {
    step: ResolvedStep;
    index: number;
    total: number;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
}

/**
 * One stage in the pipeline canvas. Square, schematic card with a filled
 * step-number medallion, the cheat's intent as the stage title, a prompt
 * preview, and a footer of stage controls (move back/forward, copy, remove).
 * A removed cheat degrades to a dashed, muted placeholder node.
 */
export function FlowNode({
    step,
    index,
    total,
    onMoveUp,
    onMoveDown,
    onRemove,
}: FlowNodeProps) {
    const { cheat, cheatId } = step;
    const num = String(index + 1).padStart(2, "0");
    const totalLabel = String(total).padStart(2, "0");
    const enterStyle = { animationDelay: `${Math.min(index, 12) * 55}ms` };

    if (cheat === null) {
        return (
            <div
                style={enterStyle}
                className="group relative flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col rounded-none border border-dashed border-border bg-muted/30 p-3 md:w-[17rem] md:shrink-0"
            >
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {num}
                        <span className="opacity-40"> / {totalLabel}</span>
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
                <p className="mt-3 text-xs italic text-muted-foreground">
                    removed cheat #{cheatId}
                </p>
            </div>
        );
    }

    const promptText = cheat.improved ?? cheat.original;

    return (
        <div
            style={enterStyle}
            className="group relative flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col rounded-none border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md md:w-[17rem] md:shrink-0"
        >
            {/* Stage header: number medallion + index ribbon + open-cheat */}
            <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center bg-primary font-mono text-xs font-bold tabular-nums text-primary-foreground">
                    {index + 1}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground">
                    {num}
                    <span className="opacity-40"> / {totalLabel}</span>
                </span>
                <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Open cheat #${cheatId}`}
                >
                    <Link href={`/cheats/${cheatId}`} tabIndex={-1}>
                        <ExternalLink />
                    </Link>
                </Button>
            </div>

            {/* Body: intent title + prompt preview */}
            <div className="mt-2.5 min-h-[5.5rem] flex-1">
                {cheat.intent && (
                    <p className="mb-1 line-clamp-1 text-sm font-semibold text-foreground">
                        {cheat.intent}
                    </p>
                )}
                <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                    {truncate(promptText)}
                </p>
            </div>

            {/* Footer: stage controls */}
            <div className="mt-2.5 flex items-center gap-0.5 border-t pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step back"
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                >
                    <ChevronLeft />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step forward"
                    disabled={index === total - 1}
                    onClick={() => onMoveDown(index)}
                >
                    <ChevronRight />
                </Button>
                <CopyButton value={promptText} size="icon-xs" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label="Remove step"
                    onClick={() => onRemove(index)}
                >
                    <X />
                </Button>
            </div>
        </div>
    );
}
