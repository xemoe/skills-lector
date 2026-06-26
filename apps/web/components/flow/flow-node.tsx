"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import type { ResolvedStep } from "@/lib/flow-resolve";

const PREVIEW_MAX = 240;

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
 * One stage card in the top-down pipeline. Full width; the numbered medallion
 * lives on the rail (rendered by FlowPipeline), so this is just the stage body:
 * an index ribbon, the cheat's intent as title, a prompt preview, and a footer
 * of stage controls (move up/down, copy, remove). A removed cheat degrades to a
 * dashed, muted card.
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
                className="group flex w-full animate-in fade-in slide-in-from-bottom-1 items-center justify-between gap-2 rounded-none border border-dashed border-border bg-muted/30 px-3 py-2.5"
            >
                <span className="text-xs italic text-muted-foreground">
                    <span className="font-mono not-italic">{num}</span> · removed cheat #{cheatId}
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
        <div
            style={enterStyle}
            className="group relative flex w-full animate-in fade-in slide-in-from-bottom-1 flex-col rounded-none border bg-card p-3 shadow-sm transition-all hover:border-primary/60 hover:shadow-md"
        >
            {/* Header: index ribbon + open-cheat */}
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
                    {num}
                    <span className="opacity-40"> / {totalLabel}</span>
                </span>
                {cheat.intent && (
                    <span className="truncate text-sm font-semibold text-foreground">
                        {cheat.intent}
                    </span>
                )}
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

            {/* Body: prompt preview */}
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {truncate(promptText)}
            </p>

            {/* Footer: stage controls */}
            <div className="mt-2.5 flex items-center gap-0.5 border-t pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step up"
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                >
                    <ChevronUp />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move step down"
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
