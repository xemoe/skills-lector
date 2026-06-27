"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Braces,
    ChevronDown,
    ChevronUp,
    Eye,
    ExternalLink,
    Sparkles,
    Undo2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { extractVariables } from "@/lib/flow-variables";
import type { ResolvedStep } from "@/lib/flow-resolve";
import type { StepChange } from "@/lib/flow-step-diff";
import type { FlowEnhancedStep } from "@lector/presets/types";
import { FlowVariableDrawer } from "./flow-variable-drawer";

const PREVIEW_MAX = 380;

// ponytail: keep newlines (codeblock renders them); only cap length.
function truncate(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > PREVIEW_MAX
        ? `${trimmed.slice(0, PREVIEW_MAX).trimEnd()}…`
        : trimmed;
}

interface FlowNodeProps {
    step: ResolvedStep;
    /** Display step number, or null for a removed ghost. */
    num: number | null;
    total: number;
    change: StepChange;
    enhanced?: FlowEnhancedStep;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: (cheatId: number) => void;
    onMoveDown: (cheatId: number) => void;
    onRemove: (cheatId: number) => void;
    onRevert: (cheatId: number) => void;
}

/** Left-border accent + the change ribbon label for each staged change kind. */
const CHANGE_ACCENT: Record<StepChange, string> = {
    unchanged: "",
    added: "border-l-2 border-l-emerald-500",
    moved: "border-l-2 border-l-amber-500",
    removed: "border-l-2 border-l-destructive",
};

/**
 * One stage card in the top-down pipeline. cheatId-based controls. When the step
 * is part of an unsaved edit (added / moved / removed) it shows a coloured change
 * ribbon with a per-item revert; a removed step renders as a struck-through ghost
 * with revert only. Enhanced steps show the rewrite + folded-in badges + the
 * variable-fill drawer.
 */
export function FlowNode({
    step,
    num,
    total,
    change,
    enhanced,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    onRemove,
    onRevert,
}: FlowNodeProps) {
    const t = useT();
    const { cheat, cheatId } = step;
    const numLabel = num !== null ? String(num).padStart(2, "0") : "—";
    const totalLabel = String(total).padStart(2, "0");
    const hasEnhanced = Boolean(enhanced);
    const [showEnhanced, setShowEnhanced] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const variables = useMemo(
        () => (enhanced ? extractVariables(enhanced.enhanced) : []),
        [enhanced],
    );

    const changeLabel =
        change === "added"
            ? t.flowsPage.changeAdded
            : change === "moved"
              ? t.flowsPage.changeMoved
              : change === "removed"
                ? t.flowsPage.changeRemoved
                : null;

    const ribbon = changeLabel && (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium",
                change === "added" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                change === "moved" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                change === "removed" && "bg-destructive/10 text-destructive",
            )}
        >
            <span className="font-mono uppercase tracking-[0.12em]">{changeLabel}</span>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-6 gap-1 px-2 text-[11px]"
                aria-label={`${t.flowsPage.revert} ${changeLabel} — ${cheat?.intent ?? `#${cheatId}`}`}
                onClick={() => onRevert(cheatId)}
            >
                <Undo2 className="size-3" />
                {t.flowsPage.revert}
            </Button>
        </div>
    );

    // Removed ghost (staged removal, or a dangling/deleted cheat): struck, revert only.
    if (change === "removed" || cheat === null) {
        const title =
            cheat === null ? `unavailable cheat #${cheatId}` : (cheat.intent ?? `step`);
        return (
            <div
                className={cn(
                    "group flex w-full animate-in fade-in slide-in-from-bottom-1 flex-col rounded-none border border-dashed bg-muted/30",
                    CHANGE_ACCENT.removed,
                )}
            >
                {ribbon}
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="truncate text-sm text-muted-foreground line-through">
                        <span className="font-mono not-italic">{numLabel}</span> · {title}
                    </span>
                    {change !== "removed" && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove step"
                            onClick={() => onRemove(cheatId)}
                        >
                            <X />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const originalText = cheat.improved ?? cheat.original;
    const showingEnhanced = hasEnhanced && showEnhanced;
    const bodyText = showingEnhanced ? enhanced!.enhanced : originalText;

    return (
        <div
            className={cn(
                "group relative flex w-full animate-in fade-in slide-in-from-bottom-1 flex-col rounded-none border bg-card shadow-sm transition-all hover:border-primary/60 hover:shadow-md",
                change !== "unchanged"
                    ? CHANGE_ACCENT[change]
                    : hasEnhanced && "border-l-2 border-l-primary/70",
            )}
        >
            {ribbon}
            <div className="flex flex-col p-5">
                {/* Header: index ribbon + intent + enhanced badge + open-cheat */}
                <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
                        {numLabel}
                        <span className="opacity-40"> / {totalLabel}</span>
                    </span>
                    {cheat.intent && (
                        <span className="truncate text-lg font-semibold text-foreground">
                            {cheat.intent}
                        </span>
                    )}
                    {hasEnhanced && (
                        <span className="inline-flex items-center gap-1 rounded-none bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                            <Sparkles className="size-3" />
                            {t.flowsPage.enhanced}
                        </span>
                    )}
                    <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Open cheat #${cheatId}`}
                    >
                        <Link href={`/cheats/${cheatId}`}>
                            <ExternalLink />
                        </Link>
                    </Button>
                </div>

                {/* Body: prompt preview as a codeblock (enhanced or raw) */}
                <pre
                    className={cn(
                        "mt-2.5 whitespace-pre-wrap break-words rounded-none border bg-muted/30 p-3 font-mono text-[13px] leading-relaxed",
                        showingEnhanced ? "text-foreground" : "text-muted-foreground",
                    )}
                >
                    {truncate(bodyText)}
                </pre>

                {/* Folded-in skill/command badges */}
                {showingEnhanced && enhanced!.foldedIn.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {t.flowsPage.foldedIn}
                        </span>
                        {enhanced!.foldedIn.map((name) => (
                            <span
                                key={name}
                                className="inline-flex items-center rounded-none border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] text-primary"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer: stage controls */}
                <div className="mt-4 flex items-center gap-1 border-t pt-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move step up"
                        disabled={!canMoveUp}
                        onClick={() => onMoveUp(cheatId)}
                    >
                        <ChevronUp />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move step down"
                        disabled={!canMoveDown}
                        onClick={() => onMoveDown(cheatId)}
                    >
                        <ChevronDown />
                    </Button>
                    <CopyButton value={bodyText} size="icon-sm" />
                    {hasEnhanced && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
                            onClick={() => setShowEnhanced((v) => !v)}
                        >
                            {showingEnhanced ? t.flowsPage.original : t.flowsPage.enhanced}
                        </Button>
                    )}
                    {showingEnhanced && variables.length > 0 ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-primary hover:text-primary"
                            onClick={() => setDrawerOpen(true)}
                        >
                            <Braces className="size-3.5" />
                            <span className="text-[11px] font-medium">
                                {t.flowsPage.fillVariables}
                            </span>
                            <span className="font-mono text-[10px] opacity-70">
                                {variables.length}
                            </span>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-muted-foreground"
                            onClick={() => setDrawerOpen(true)}
                        >
                            <Eye className="size-3.5" />
                            <span className="text-[11px] font-medium">{t.flowsPage.view}</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Remove step"
                        onClick={() => onRemove(cheatId)}
                    >
                        <X />
                    </Button>
                </div>
            </div>

            <FlowVariableDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={`${numLabel} · ${cheat.intent ?? "step"}`}
                text={bodyText}
            />
        </div>
    );
}
