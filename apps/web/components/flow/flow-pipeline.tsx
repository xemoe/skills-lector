"use client";

import { useMemo, useState } from "react";
import { Play, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { Cheat, FlowEnhancedStep } from "@lector/presets/types";
import type { StepChange } from "@/lib/flow-step-diff";
import { FlowNode } from "./flow-node";
import { FlowVariableDrawer } from "./flow-variable-drawer";

/** One render row: a resolved step plus its staged-change tag. */
export interface PipelineRow {
    cheatId: number;
    cheat: Cheat | null;
    change: StepChange;
    /** Index among the draft steps; null for a removed ghost. */
    draftIndex: number | null;
}

interface FlowPipelineProps {
    rows: PipelineRow[];
    draftCount: number;
    enhancedByCheatId?: Map<number, FlowEnhancedStep>;
    onMoveUp: (cheatId: number) => void;
    onMoveDown: (cheatId: number) => void;
    onRemove: (cheatId: number) => void;
    onRevert: (cheatId: number) => void;
    onAdd: () => void;
}

type RailKind = "start" | "step" | "removed" | "add";

function Rail({
    kind,
    label,
    top,
    bottom,
}: {
    kind: RailKind;
    label?: number | string;
    top: boolean;
    bottom: boolean;
}) {
    return (
        <div className="relative flex w-10 shrink-0 flex-col items-center self-stretch">
            <span
                className={cn(
                    "w-px flex-1",
                    top ? "bg-border" : "bg-transparent",
                )}
            />
            <span
                className={cn(
                    "z-10 my-0.5 flex size-9 shrink-0 items-center justify-center",
                    kind === "step" &&
                        "bg-primary font-mono text-sm font-bold tabular-nums text-primary-foreground",
                    kind === "removed" &&
                        "border border-dashed border-destructive/50 font-mono text-xs text-destructive/70 line-through",
                    kind === "start" && "bg-primary/15 text-primary",
                    kind === "add" &&
                        "border-2 border-dashed border-border text-muted-foreground",
                )}
            >
                {(kind === "step" || kind === "removed") && label}
                {kind === "start" && <Play className="size-4 fill-current" />}
                {kind === "add" && <Plus className="size-4" />}
            </span>
            <span
                className={cn(
                    "w-px flex-1",
                    bottom ? "bg-border" : "bg-transparent",
                )}
            />
        </div>
    );
}

/**
 * The flow as a top-down pipeline. Renders diff rows: active steps numbered on
 * the rail, removed steps as struck ghost rows. All controls are cheatId-based.
 */
export function FlowPipeline({
    rows,
    draftCount,
    enhancedByCheatId,
    onMoveUp,
    onMoveDown,
    onRemove,
    onRevert,
    onAdd,
}: FlowPipelineProps) {
    const t = useT();
    const empty = draftCount === 0;

    // Index into `openable` of the step shown in the shared drawer; null = closed.
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    // Active (non-removed, resolvable) steps in display order — what the drawer
    // walks with prev/next. Index here matches the on-rail step number minus 1.
    const openable = useMemo(() => {
        const list: {
            cheatId: number;
            title: string;
            text: string;
        }[] = [];
        let n = 0;
        for (const row of rows) {
            if (row.change === "removed" || !row.cheat) continue;
            n += 1;
            const enhanced = enhancedByCheatId?.get(row.cheatId);
            const text =
                enhanced?.enhanced ?? row.cheat.improved ?? row.cheat.original;
            list.push({
                cheatId: row.cheatId,
                title: `${String(n).padStart(2, "0")} · ${row.cheat.intent ?? "step"}`,
                text,
            });
        }
        return list;
    }, [rows, enhancedByCheatId]);

    const openStep = openIndex !== null ? (openable[openIndex] ?? null) : null;

    // Running 1-based number for active (non-removed) steps.
    let stepNo = 0;

    return (
        <>
        <div className="flow-canvas rounded-none border bg-muted/20 p-4 md:p-6">
            <div className="mx-auto max-w-3xl">
                {/* Start cap */}
                <div className="flex items-center gap-4">
                    <Rail kind="start" top={false} bottom />
                    <span className="inline-flex items-center rounded-none border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                        {t.flowsPage.start}
                    </span>
                </div>

                {/* Steps */}
                {rows.map((row) => {
                    const removed = row.change === "removed";
                    const num = removed ? null : ++stepNo;
                    return (
                        <div
                            key={`${row.cheatId}-${removed ? "x" : "a"}`}
                            className="flex items-stretch gap-4"
                        >
                            <Rail
                                kind={removed ? "removed" : "step"}
                                label={removed ? "×" : (num ?? undefined)}
                                top
                                bottom
                            />
                            <div className="min-w-0 flex-1 py-2">
                                <FlowNode
                                    step={{
                                        cheatId: row.cheatId,
                                        cheat: row.cheat,
                                    }}
                                    num={num}
                                    total={draftCount}
                                    change={row.change}
                                    enhanced={enhancedByCheatId?.get(
                                        row.cheatId,
                                    )}
                                    canMoveUp={
                                        row.draftIndex !== null &&
                                        row.draftIndex > 0
                                    }
                                    canMoveDown={
                                        row.draftIndex !== null &&
                                        row.draftIndex < draftCount - 1
                                    }
                                    onMoveUp={onMoveUp}
                                    onMoveDown={onMoveDown}
                                    onRemove={onRemove}
                                    onRevert={onRevert}
                                    onOpen={() =>
                                        num !== null && setOpenIndex(num - 1)
                                    }
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Add-step terminal */}
                <div className="flex items-stretch gap-4">
                    <Rail kind="add" top bottom={false} />
                    <div className="flex-1 py-2">
                        <button
                            type="button"
                            onClick={onAdd}
                            className="group flex w-full items-center justify-center gap-2 rounded-none border-2 border-dashed border-border p-5 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                        >
                            <Plus className="size-5" />
                            <span className="text-sm font-medium">
                                {empty
                                    ? t.flowsPage.addFirstStep
                                    : t.flowsPage.addStep}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <FlowVariableDrawer
            open={openStep !== null}
            onOpenChange={(o) => {
                if (!o) setOpenIndex(null);
            }}
            title={openStep?.title ?? ""}
            text={openStep?.text ?? ""}
            positionLabel={
                openIndex !== null
                    ? `${openIndex + 1} / ${openable.length}`
                    : undefined
            }
            hasPrev={openIndex !== null && openIndex > 0}
            hasNext={openIndex !== null && openIndex < openable.length - 1}
            onPrev={() =>
                setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i))
            }
            onNext={() =>
                setOpenIndex((i) =>
                    i !== null && i < openable.length - 1 ? i + 1 : i,
                )
            }
        />
        </>
    );
}
